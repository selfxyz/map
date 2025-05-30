"use client"

import { Grid, Tooltip, Zoom } from '@mui/material';
import React, { useEffect, useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
  Sphere,
} from 'react-simple-maps';
import ReactCountryFlag from 'react-country-flag';
import useSettings from '@/hooks/useSettings';
import { supportIndicator } from './supported-algorithms-verifier';

const geoUrl = "data/countries-110m.json";

enum IssuanceStatus {
  NO_ISSUANCE = 0,
  NO_CERT_AVAILABLE = 1,
  NO_SUPPORT = 2,
  PARTIAL_SUPPORT = 3,
  FULL_SUPPORT = 4,
}

type CountryData = {
  countryCode: string;
  dscData: CertDetail[];
  cscaData: CertDetail[];
  issuanceStatus: IssuanceStatus;
}

export type CertDetail = {
  signature_algorithm: string;
  hash_algorithm: string;
  curve_exponent: string;
  bit_length: number;
  amount: number;
  isSupported?: boolean;
};

type SigAlgData = Record<string, CertDetail[]>

// Recent data on the number of biometric passports issued in millions
const BIOMETRIC_PASSPORTS_ISSUED = {
  "Canada": 27,
  "China": 212,
  "France": 34,
  "Germany": 34,
  "Japan": 21,
  "United Kingdom": 51,
  "United States of America": 167,
};

const COUNTRY_SPECIFIC_COMMENTS = {
  "India": "Just recently started issuing e-passports, penetration is very low.",
  "Iran": "Atypical use of RSA, not planning on reaching full support in the near future.",
  "Austria": "Atypical use of RSA, not planning on reaching full support in the near future.",
}

const COLORS = {
  [IssuanceStatus.NO_ISSUANCE]: '#b4b5b3',
  [IssuanceStatus.NO_CERT_AVAILABLE]: '#b0cca3',
  [IssuanceStatus.NO_SUPPORT]: '#90b576',
  [IssuanceStatus.PARTIAL_SUPPORT]: '#70ac48',
  [IssuanceStatus.FULL_SUPPORT]: '#548233',
  "HOVER": '#4d7332',
  "PRESSED": '#507f3a',
}


export default function MapChart() {
  const [countryData, setCountryData] = useState<Record<string, CountryData>>({});
  const { isMobile } = useSettings();
  const [countryName, setCountryName] = useState('');

  const mergeMetadata = (
    dscInput: SigAlgData,
    cscaInput: SigAlgData,
    countriesIssuing: string[],
    countryNames: Record<string, string>
  ): Record<string, CountryData> => {
    return Object.keys(countryNames).reduce((acc, countryCode) => {
      const name = countryNames[countryCode];

      const dscDataWithSupport = dscInput[countryCode]?.map(cert => ({
        ...cert,
        isSupported: supportIndicator(cert, 'dsc')
      })) || [];

      const cscaDataWithSupport = cscaInput[countryCode]?.map(cert => ({
        ...cert,
        isSupported: supportIndicator(cert, 'csca')
      })) || [];

      // Special case for India - mark as not issuing e-passports
      if (name === 'India') {
        acc[name] = {
          countryCode,
          dscData: dscDataWithSupport,
          cscaData: cscaDataWithSupport,
          issuanceStatus: IssuanceStatus.NO_ISSUANCE
        };
        return acc;
      }
      
      acc[name] = {
        countryCode,
        dscData: dscDataWithSupport,
        cscaData: cscaDataWithSupport,
        issuanceStatus: 
          cscaDataWithSupport.length > 0 &&
          dscDataWithSupport.every(cert => cert.isSupported) &&
          cscaDataWithSupport.every(cert => cert.isSupported)
            ? IssuanceStatus.FULL_SUPPORT :
          cscaDataWithSupport.length > 0 &&
          cscaDataWithSupport.some(cert => cert.isSupported)
            ? IssuanceStatus.PARTIAL_SUPPORT :
          cscaDataWithSupport.length > 0 &&
          !cscaDataWithSupport.some(cert => cert.isSupported)
            ? IssuanceStatus.NO_SUPPORT :
          countriesIssuing.includes(countryCode)
            ? IssuanceStatus.NO_CERT_AVAILABLE :
          IssuanceStatus.NO_ISSUANCE,
      };

      return acc;
    }, {} as Record<string, CountryData>);
  };

  const fetchMapData = async () => {
    try {
      const dscData: SigAlgData = await fetch('https://raw.githubusercontent.com/selfxyz/self/52dba2742b4c37a957eb5ab8ebee83fdccdcf187/registry/outputs/map_dsc.json')
        .then(response => response.json());

      const cscaData: SigAlgData = await fetch('https://raw.githubusercontent.com/selfxyz/self/52dba2742b4c37a957eb5ab8ebee83fdccdcf187/registry/outputs/map_csca.json')
        .then(response => response.json());

      const countryNames = (await import(
        './../../public/data/all-countries.json'
      )).default;

      const countriesIssuingEPassports = (await import(
        './../../public/data/issuing-countries.json'
      )).default;
      
      setCountryData(mergeMetadata(
        dscData,
        cscaData,
        countriesIssuingEPassports,
        countryNames
      ));
    } catch (err) {
      console.log('error fetching map data', err);
    }
  };

  useEffect(() => {
    fetchMapData();
  }, []);

  const formatAlgorithmDetails = (cert: any) => {
    if (cert.signature_algorithm === 'rsapss') {
      cert.signature_algorithm = 'rsa-pss';
    }

    const signatureStr = `${cert.hash_algorithm.toLowerCase()} with ${cert.signature_algorithm.toLowerCase()}`;

    const keyDetails = cert.signature_algorithm === 'ecdsa'
      ? `${cert?.curve_exponent}`
      : `e=${cert?.curve_exponent} ${cert?.bit_length}`;

    return {
      signatureStr,
      keyDetails
    };
  };

  const highLightInfo = (countryName: string) => {
    const data = countryData[countryName];

    if (!data) {
      return (
        <div className="workInProgress text-white">
          <h3 className="flex items-center justify-start gap-2 text-white">
            <b>{countryName || ''}</b>
            <ReactCountryFlag
              countryCode={countryData[countryName]?.countryCode}
              svg
              style={{
                width: '1.5em',
                height: '1em',
                verticalAlign: 'middle',
              }}
              title={countryName}
            />
          </h3>
          {countryData[countryName]?.issuanceStatus === IssuanceStatus.NO_CERT_AVAILABLE ? (
            <p className="text-white">Issuing but certificates not published</p>
          ) : countryData[countryName] && isMobile ? (
            <>
              <p className="text-white">Work in progress</p>
            </>
          ) : (
            isMobile && (
              <>
                <p className="text-white">Not issuing e-passport</p>
              </>
            )
          )}
        </div>
      );
    }
    const accurateCountryCount = BIOMETRIC_PASSPORTS_ISSUED[countryName as keyof typeof BIOMETRIC_PASSPORTS_ISSUED];
    const countrySpecificComment = COUNTRY_SPECIFIC_COMMENTS[countryName as keyof typeof COUNTRY_SPECIFIC_COMMENTS];

    return (
      <div className="highlightInfo text-white">
        <h3 className="flex items-center justify-start gap-2 text-white">
          <b>{countryName || ''}</b>
          <ReactCountryFlag
            countryCode={data.countryCode}
            svg
            style={{
              width: '1.5em',
              height: '1em',
              verticalAlign: 'middle',
            }}
            title={countryName}
          />
        </h3>

        <div className="issued-dscs text-white">
          {accurateCountryCount ? (
            <p className="issuedCount text-white">
              ~ {new Intl.NumberFormat().format(
                  accurateCountryCount * 1_000_000
              )}{' '}
              passports issued
            </p>
          ) : null}

          {countrySpecificComment && (
            <p className="issuedCount text-white">
              {countrySpecificComment}
            </p>
          )}

          {data.issuanceStatus === IssuanceStatus.NO_ISSUANCE && countryName !== 'India' && (
            <p className="issuedCount text-white">
              Not issuing e-passport
            </p>
          )}

          {data.issuanceStatus === IssuanceStatus.NO_CERT_AVAILABLE && (
            <p className="issuedCount text-white">
              Issuing biometric passports, but no certificates published on international registries.
            </p>
          )}

          {/* Show CSCA certificates */}
          {data.cscaData.length > 0 && (
            <div className="text-white">
              <p className="algorithmTitle font-semibold mt-2 text-white">Top-level Certificates (CSCA)</p>
              {data.cscaData.map((csca: any, index: number) => {
                const { signatureStr, keyDetails } = formatAlgorithmDetails(csca);

                return (
                  <p
                    key={`csca-${index}`}
                    className="flex items-center text-nowrap text-white"
                  >
                    &nbsp;-&nbsp;
                    {`${csca.amount} issued: ${signatureStr} ${keyDetails}`}
                    {csca.isSupported ? '  ✅' : '  🚧'}
                  </p>
                );
              })}
            </div>
          )}

          {/* Show DSC certificates */}
          {data.dscData.length > 0 && (
            <div className="text-white">
              <p className="algorithmTitle font-semibold mt-2 text-white">
                Intermediate Certificates (DSC)
              </p>
              {data.dscData.map((dsc: any, index: number) => {
                const { signatureStr, keyDetails } = formatAlgorithmDetails(dsc);

                return (
                  <p
                    key={`dsc-${index}`}
                    className="flex items-center text-nowrap text-white"
                  >
                    &nbsp;-&nbsp;
                    {`${dsc.amount} issued: ${signatureStr} ${keyDetails}`}
                    {dsc.isSupported ? '  ✅' : '  🚧'}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (Object.keys(countryData).length === 0) {
    return (
      <div>
        <div className={`mapRow`}>
          <div className={`mapSection`}>
            <div className="workInProgress text-white">
              <p>Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={`mapRow`}>
        <div className={`mapSection`}>
          <div data-tip="" className="globalMap">
            <ComposableMap
              projectionConfig={{ center: [14, 6] }}
              width={isMobile ? 750 : 880}
              height={500}
            >
              <Graticule stroke="#999" strokeWidth={0.2} />
              <Sphere
                stroke="#fff"
                strokeWidth={0.1}
                id={'sphereline'}
                fill={'#ffffff00'}
              />
              <Geographies
                geography={geoUrl}
                fill="#e1e1e1"
                stroke="#fff"
                strokeWidth={0.3}
              >
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Tooltip
                      enterTouchDelay={0}
                      leaveTouchDelay={6000}
                      classes={{ tooltip: 'country-tooltip' }}
                      title={highLightInfo(geo.properties.name)}
                      disableTouchListener={isMobile}
                      disableHoverListener={isMobile}
                      placement={'right'}
                      arrow
                      key={geo.rsmKey}
                      TransitionComponent={Zoom}
                      TransitionProps={{ timeout: 50 }}
                    >
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        className="font-alliance"
                        onClick={() => {
                          if (isMobile) {
                            setCountryName(geo.properties.name);
                          }
                        }}
                        onMouseEnter={() => {
                          if (isMobile) {
                            setCountryName(geo.properties.name);
                          }
                        }}
                        style={{
                          default: {
                            fill: COLORS[countryData[geo.properties.name]?.issuanceStatus] ?? COLORS[IssuanceStatus.NO_ISSUANCE],
                          },
                          hover: {
                            fill: COLORS.HOVER,
                          },
                          pressed: {
                            fill: COLORS.PRESSED,
                          },
                        }}
                      />
                    </Tooltip>
                  ))
                }
              </Geographies>
            </ComposableMap>
          </div>
        </div>
      </div>
      <Grid
        container
        spacing={2}
        className={`sm:mt-3 mt-0 countryDetailsRow`}
      >
        <Grid
          sm={6}
          xs={12}
          id="countryDetails"
          className="md:hidden text-gray-900 sm:border-0"
        >
          {highLightInfo(countryName)}
        </Grid>
        <Grid
          sm={6}
          xs={12}
          className="legend-info lg:left-6 text-black relative bottom-2 lg:bottom-12 lg:absolute"
        >
          <h2 className={`homeTitle`}>Self country coverage</h2>
          <div className="legend-info-item flex items-center">
            <p
              style={{ backgroundColor: COLORS[IssuanceStatus.FULL_SUPPORT] }}
              className={`w-8 h-4 ${isMobile ? 'ms-2' : 'me-2'}`}
            ></p>{' '}
            Fully supported
          </div>
          <div className="legend-info-item flex items-center">
            <p
              style={{ backgroundColor: COLORS[IssuanceStatus.PARTIAL_SUPPORT] }}
              className={`w-8 h-4 ${isMobile ? 'ms-2' : 'me-2'}`}
            ></p>{' '}
            Partially supported
          </div>
          <div className="legend-info-item flex items-center">
            <p
              style={{ backgroundColor: COLORS[IssuanceStatus.NO_SUPPORT] }}
              className={`w-8 h-4 ${isMobile ? 'ms-2' : 'me-2'}`}
            ></p>{' '}
            Not supported
          </div>
          <div className="legend-info-item flex items-center">
            <p
              style={{ backgroundColor: COLORS[IssuanceStatus.NO_CERT_AVAILABLE] }}
              className={`w-8 h-4 ${isMobile ? 'ms-2' : 'me-2'}`}
            ></p>{' '}
            Issuing but no certificates available
          </div>
          <div className="legend-info-item flex items-center">
            <p
              style={{ backgroundColor: COLORS[IssuanceStatus.NO_ISSUANCE] }}
              className={`w-8 h-4 ${isMobile ? 'ms-2' : 'me-2'}`}
            ></p>{' '}
            Not issuing e-passport
          </div>
        </Grid>
      </Grid>
    </div>
  );
}
