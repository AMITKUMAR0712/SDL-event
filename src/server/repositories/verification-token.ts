import { db } from "@/lib/db";

export function createVerificationToken(identifier: string, token: string, expires: Date) {
  return db.verificationToken.create({ data: { identifier, token, expires } });
}

export async function consumeVerificationToken(identifier: string, token: string) {
  const record = await db.verificationToken.findUnique({
    where: { identifier_token: { identifier, token } },
  });

  if (!record || record.expires.getTime() < Date.now()) {
    return null;
  }

  await db.verificationToken.delete({ where: { identifier_token: { identifier, token } } });
  return record;
}
