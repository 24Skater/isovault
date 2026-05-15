import crypto from 'crypto';
import fs from 'fs';
import type { ChecksumAlgorithm } from '../types';
import { ChecksumMismatchError } from '../errors/base';

export function computeFileChecksum(
  filePath: string,
  algorithm: ChecksumAlgorithm,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const stream = fs.createReadStream(filePath);

    stream.on('error', reject);
    stream.on('data', (chunk: Buffer | string) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export async function verifyFileChecksum(
  filePath: string,
  algorithm: ChecksumAlgorithm,
  expected: string,
): Promise<void> {
  const actual = await computeFileChecksum(filePath, algorithm);
  if (actual !== expected.toLowerCase()) {
    throw new ChecksumMismatchError(expected, actual, filePath);
  }
}
