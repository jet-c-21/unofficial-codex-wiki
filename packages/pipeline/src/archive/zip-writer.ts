import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { deflateRawSync } from "node:zlib";
import { toPortablePath } from "@unofficial-codex-wiki/core";

export type ZipArchiveEntry = {
  path: string;
  content: Buffer | string;
  modifiedAt?: Date;
};

export type ZipArchiveInspection = {
  entryCount: number;
  entries: string[];
};

type PreparedZipEntry = {
  path: string;
  pathBytes: Buffer;
  content: Buffer;
  compressedContent: Buffer;
  crc32: number;
  modifiedAt: Date;
  localHeaderOffset: number;
};

export async function writeZipArchive(outputPath: string, entries: readonly ZipArchiveEntry[]): Promise<number> {
  if (entries.length === 0) {
    throw new Error("Cannot create an empty ZIP archive.");
  }

  const preparedEntries = prepareEntries(entries);
  const fileParts: Buffer[] = [];
  const centralDirectoryParts: Buffer[] = [];
  let offset = 0;

  for (const entry of preparedEntries) {
    entry.localHeaderOffset = offset;
    const localHeader = createLocalFileHeader(entry);
    fileParts.push(localHeader, entry.compressedContent);
    offset += localHeader.length + entry.compressedContent.length;
  }

  const centralDirectoryOffset = offset;
  for (const entry of preparedEntries) {
    const centralDirectoryHeader = createCentralDirectoryHeader(entry);
    centralDirectoryParts.push(centralDirectoryHeader);
    offset += centralDirectoryHeader.length;
  }

  const centralDirectorySize = offset - centralDirectoryOffset;
  const endOfCentralDirectory = createEndOfCentralDirectory(
    preparedEntries.length,
    centralDirectorySize,
    centralDirectoryOffset
  );
  const archive = Buffer.concat([...fileParts, ...centralDirectoryParts, endOfCentralDirectory]);

  await mkdir(path.dirname(outputPath), { recursive: true });
  const temporaryOutputPath = `${outputPath}.tmp-${process.pid}-${Date.now()}`;
  try {
    await writeFile(temporaryOutputPath, archive);
    await rename(temporaryOutputPath, outputPath);
  } catch (error) {
    await rm(temporaryOutputPath, { force: true });
    throw error;
  }

  return archive.length;
}

export function inspectZipArchive(content: Buffer): ZipArchiveInspection {
  const eocdOffset = findEndOfCentralDirectoryOffset(content);
  if (eocdOffset === -1) {
    throw new Error("ZIP archive is missing the end-of-central-directory record.");
  }

  const entryCount = content.readUInt16LE(eocdOffset + 10);
  const centralDirectorySize = content.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = content.readUInt32LE(eocdOffset + 16);
  if (entryCount < 1) {
    throw new Error("ZIP archive does not contain any entries.");
  }
  if (centralDirectoryOffset + centralDirectorySize > content.length || centralDirectoryOffset >= eocdOffset) {
    throw new Error("ZIP archive central directory is out of bounds.");
  }

  const entries: string[] = [];
  let cursor = centralDirectoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (content.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error("ZIP archive central directory entry is malformed.");
    }

    const compressedSize = content.readUInt32LE(cursor + 20);
    const fileNameLength = content.readUInt16LE(cursor + 28);
    const extraFieldLength = content.readUInt16LE(cursor + 30);
    const fileCommentLength = content.readUInt16LE(cursor + 32);
    const localHeaderOffset = content.readUInt32LE(cursor + 42);
    const fileNameStart = cursor + 46;
    const fileNameEnd = fileNameStart + fileNameLength;
    if (fileNameEnd > content.length || localHeaderOffset + 30 > content.length) {
      throw new Error("ZIP archive entry points outside the archive.");
    }
    if (content.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      throw new Error("ZIP archive local file header is malformed.");
    }

    const localNameLength = content.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = content.readUInt16LE(localHeaderOffset + 28);
    const compressedContentOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
    if (compressedContentOffset + compressedSize > content.length) {
      throw new Error("ZIP archive compressed entry data is out of bounds.");
    }

    entries.push(content.subarray(fileNameStart, fileNameEnd).toString("utf8"));
    cursor = fileNameEnd + extraFieldLength + fileCommentLength;
  }

  return {
    entryCount,
    entries
  };
}

function findEndOfCentralDirectoryOffset(content: Buffer): number {
  const minimumRecordLength = 22;
  if (content.length < minimumRecordLength) {
    return -1;
  }

  const earliestOffset = Math.max(0, content.length - 65_557);
  for (let offset = content.length - minimumRecordLength; offset >= earliestOffset; offset -= 1) {
    if (content.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }

  return -1;
}

function prepareEntries(entries: readonly ZipArchiveEntry[]): PreparedZipEntry[] {
  return entries
    .map((entry) => {
      const entryPath = normalizeZipEntryPath(entry.path);
      const content = Buffer.isBuffer(entry.content)
        ? entry.content
        : Buffer.from(entry.content, "utf8");

      return {
        path: entryPath,
        pathBytes: Buffer.from(entryPath, "utf8"),
        content,
        compressedContent: deflateRawSync(content),
        crc32: crc32(content),
        modifiedAt: entry.modifiedAt ?? new Date(),
        localHeaderOffset: 0
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}

function normalizeZipEntryPath(entryPath: string): string {
  const portablePath = toPortablePath(entryPath).replace(/^\/+/u, "");
  if (portablePath.length === 0 || portablePath.startsWith("../") || portablePath === "..") {
    throw new Error(`Invalid ZIP entry path: ${entryPath}`);
  }
  return portablePath;
}

function createLocalFileHeader(entry: PreparedZipEntry): Buffer {
  const header = Buffer.alloc(30 + entry.pathBytes.length);
  const { dosDate, dosTime } = toDosDateTime(entry.modifiedAt);

  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6);
  header.writeUInt16LE(8, 8);
  header.writeUInt16LE(dosTime, 10);
  header.writeUInt16LE(dosDate, 12);
  header.writeUInt32LE(entry.crc32, 14);
  header.writeUInt32LE(entry.compressedContent.length, 18);
  header.writeUInt32LE(entry.content.length, 22);
  header.writeUInt16LE(entry.pathBytes.length, 26);
  header.writeUInt16LE(0, 28);
  entry.pathBytes.copy(header, 30);

  return header;
}

function createCentralDirectoryHeader(entry: PreparedZipEntry): Buffer {
  const header = Buffer.alloc(46 + entry.pathBytes.length);
  const { dosDate, dosTime } = toDosDateTime(entry.modifiedAt);

  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0x0800, 8);
  header.writeUInt16LE(8, 10);
  header.writeUInt16LE(dosTime, 12);
  header.writeUInt16LE(dosDate, 14);
  header.writeUInt32LE(entry.crc32, 16);
  header.writeUInt32LE(entry.compressedContent.length, 20);
  header.writeUInt32LE(entry.content.length, 24);
  header.writeUInt16LE(entry.pathBytes.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(entry.localHeaderOffset, 42);
  entry.pathBytes.copy(header, 46);

  return header;
}

function createEndOfCentralDirectory(entryCount: number, centralDirectorySize: number, centralDirectoryOffset: number): Buffer {
  const header = Buffer.alloc(22);

  header.writeUInt32LE(0x06054b50, 0);
  header.writeUInt16LE(0, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(entryCount, 8);
  header.writeUInt16LE(entryCount, 10);
  header.writeUInt32LE(centralDirectorySize, 12);
  header.writeUInt32LE(centralDirectoryOffset, 16);
  header.writeUInt16LE(0, 20);

  return header;
}

function toDosDateTime(date: Date): { dosDate: number; dosTime: number } {
  const year = Math.min(Math.max(date.getFullYear(), 1980), 2107);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  return {
    dosDate: ((year - 1980) << 9) | (month << 5) | day,
    dosTime: (hours << 11) | (minutes << 5) | seconds
  };
}

const crc32Table = createCrc32Table();

function crc32(content: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of content) {
    crc = (crc >>> 8) ^ (crc32Table[(crc ^ byte) & 0xff] ?? 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[index] = value >>> 0;
  }
  return table;
}
