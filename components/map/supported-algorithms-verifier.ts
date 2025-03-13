type CertDetail = {
  signature_algorithm: string;
  hash_algorithm: string;
  curve_exponent: string;
  bit_length: number;
  amount: number;
};

/**
 * verify the incoming alg, hash, bits are supported or not.
 */
const supportIndicator = (countryCert: CertDetail, type: string = 'dsc') => {
  // Normalize signature algorithm name for consistency
  let signatureAlg = countryCert.signature_algorithm;
  if (signatureAlg === 'rsa-pss') {
    signatureAlg = 'rsapss';
  }

  if (type === 'dsc') {
    // dsc supported algs added here
    const supportedListDsc: any = {
      rsa: {
        sha1: {
          curves: [
            '65537', '3',
          ],
          bits: [
            2048, 3072, 4096
          ],
        },
        sha256: {
          curves: [
            '65537', '3',
          ],
          bits: [
            2048, 3072, 4096
          ],
        },
        sha384: {
          curves: [
            '65537', '3',
          ],
          bits: [
            2048, 3072, 4096
          ],
        },
        sha512: {
          curves: [
            '65537', '3',
          ],
          bits: [
            2048, 3072, 4096
          ],
        },
      },
      rsapss: {
        sha1: {
          curves: [
            '65537', '3',
          ],
          bits: [2048, 3072, 4096]
        },
        sha256: {
          curves: [
            '65537', '3',
          ],
          bits: [
            2048, 3072, 4096
          ],
        },
        sha384: {
          curves: [
            '65537', '3',
          ],
          bits: [
            2048, 3072, 4096
          ],
        },
        sha512: {
          curves: [
            '65537', '3',
          ],
          bits: [
            2048, 3072, 4096
          ],
        },
      },
      ecdsa: {
        sha1: {
          curves: [
            'brainpoolp224r1',
            'brainpoolp256r1',
            'secp256r1',
            'secp384r1',
            'brainpoolp384r1',
          ],
          bits: [224, 256, 384]
        },
        sha256: {
          curves: [
            'brainpoolp224r1',
            'brainpoolp256r1',
            'secp256r1',
            'secp384r1',
            'brainpoolp384r1',
          ],
          bits: [224, 256, 384]
        },
        sha384: {
          curves: [
            'brainpoolp224r1',
            'brainpoolp256r1',
            'secp256r1',
            'secp384r1',
            'brainpoolp384r1',
          ],
          bits: [224, 256, 384]
        },
        sha512: {
          curves: [
            'brainpoolp224r1',
            'brainpoolp256r1',
            'secp256r1',
            'secp384r1',
            'brainpoolp384r1',
          ],
          bits: [224, 256, 384]
        }
      },
    }

    let signatureSupport = false;
    let hashSupport = false;
    let curveSupport = false;
    let bitsSupport = false;

    if (supportedListDsc[signatureAlg]) {
      signatureSupport = true;
      const hash_algorithm = countryCert.hash_algorithm;
      if (supportedListDsc[signatureAlg][hash_algorithm]) {
        hashSupport = true;
        const supportedAlgs =
          supportedListDsc[signatureAlg][hash_algorithm];
        if (supportedAlgs.curves.includes(countryCert.curve_exponent)) {
          curveSupport = true;
        }
        if (supportedAlgs.bits.includes(countryCert.bit_length)) {
          bitsSupport = true;
        }
      }
    }

    return signatureSupport && hashSupport && curveSupport && bitsSupport;
  }

  if (type === 'csca') {
    // csca supported algs added here
    const supportedListCsca: any = {
      rsa: {
        sha1: {
          curves: [
            '65537', '3',
          ],
          bits: [2048, 3072, 4096]
        },
        sha256: {
          curves: [
            '65537', '3',
          ],
          bits: [2048, 3072, 4096]
        },
        sha384: {
          curves: [
            '65537', '3',
          ],
          bits: [2048, 3072, 4096]
        },
        sha512: {
          curves: [
            '65537', '3',
          ],
          bits: [2048, 3072, 4096]
        },
      },
      rsapss: {
        sha1: {
          curves: [
            '65537', '3',
          ],
          bits: [2048, 3072, 4096]
        },
        sha256: {
          curves: [
            '3',
            '65537'
          ],
          bits: [
            2048,
            3072,
            4096
          ]
        },
        sha384: {
          curves: [
            '3',
            '65537'
          ],
          bits: [
            2048,
            3072,
            4096
          ]
        },
        sha512: {
          curves: [
            '3',
            '65537'
          ],
          bits: [
            2048,
            3072,
            4096
          ]
        },
      },
      ecdsa: {
        sha1: {
          curves: [
            'brainpoolp224r1',
            'brainpoolp256r1',
            'secp256r1',
            'secp384r1',
            'brainpoolp384r1',
          ],
          bits: [224, 256, 384]
        },
        sha256: {
          curves: [
            'brainpoolp224r1',
            'brainpoolp256r1',
            'secp256r1',
            'secp384r1',
            'brainpoolp384r1',
          ],
          bits: [224, 256, 384]
        },
        sha384: {
          curves: [
            'brainpoolp224r1',
            'brainpoolp256r1',
            'secp256r1',
            'secp384r1',
            'brainpoolp384r1',
          ],
          bits: [224, 256, 384]
        },
        sha512: {
          curves: [
            'brainpoolp224r1',
            'brainpoolp256r1',
            'secp256r1',
            'secp384r1',
            'brainpoolp384r1',
          ],
          bits: [224, 256, 384]
        }
      }
    }

    let signatureSupport = false;
    let hashSupport = false;
    let curveSupport = false;
    let bitsSupport = false;

    if (supportedListCsca[signatureAlg]) {
      signatureSupport = true;
      const hash_algorithm = countryCert.hash_algorithm;
      if (supportedListCsca[signatureAlg][hash_algorithm]) {
        hashSupport = true;
        const supportedAlgs =
          supportedListCsca[signatureAlg][hash_algorithm];
        if (supportedAlgs.curves.includes(countryCert.curve_exponent)) {
          curveSupport = true;
        }
        if (supportedAlgs.bits.includes(countryCert.bit_length)) {
          bitsSupport = true;
        }
      }
    }

    return signatureSupport && hashSupport && curveSupport && bitsSupport;
  }
};

export { supportIndicator };