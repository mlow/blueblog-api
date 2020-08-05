import gql from "graphql-tag";

export const typeDefs = gql`
  enum EncryptionCipher {
    AES_256_GCM
  }

  interface EncryptionParams {
    """
    The cipher that was used.
    """
    cipher: EncryptionCipher!
  }

  type Aes256GcmParams implements EncryptionParams {
    """
    Always returns 'AES_256_GCM'
    """
    cipher: EncryptionCipher!

    """
    The base64 encoded intialization vector.
    """
    iv: String!
  }

  interface Encrypted {
    """
    The encryption params.
    """
    encryption_params: EncryptionParams!

    """
    Base64 encoded string of the ciphertext.
    """
    ciphertext: String!
  }

  input EncryptedInput {
    encryption_params: JSONObject!

    ciphertext: String!
  }
`;

export const enum Cipher {
  AES_256_GCM = "AES_256_GCM",
}

export function validateEncryptedInput({ encryption_params, ciphertext }: any) {
  if (encryption_params || ciphertext) {
    if (!(encryption_params && ciphertext)) {
      throw new Error(
        "Cannot specify only one of `encryption_params` and `ciphertext`."
      );
    }
  } else {
    return;
  }

  if (!encryption_params.cipher) {
    throw new Error("Missing `cipher` in encryption_params.");
  }
  switch (encryption_params.cipher) {
    case Cipher.AES_256_GCM:
      if (!encryption_params.iv) {
        throw new Error(
          "Missing `iv` in encryption_params required for cipher AES_256_GCM."
        );
      }
      if (typeof encryption_params.iv !== "string") {
        throw new Error(
          "Parameter `iv` in encryption_params for cipher AES_256_GCM must be a string."
        );
      }
      break;
    default:
      throw new Error(`Unsupported cipher \`${encryption_params.cipher}\``);
  }
}

export const resolvers = {
  EncryptionParams: {
    __resolveType(obj: any) {
      switch (obj.cipher) {
        case "AES_256_GCM":
          return "Aes256GcmParams";
        default:
          throw new Error(`Unimplemented cipher: ${obj.cipher}`);
      }
    },
  },
};
