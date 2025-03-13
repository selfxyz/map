'use client';

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

const geoUrl = 'data/countries-110m.json';

export default function MapChart() {
  type ObjectBool = {
    [key: string]: boolean;
  };

  type ObjectStr = {
    [key: string]: string;
  };

  type ObjectNum = {
    [key: string]: number;
  };

  enum issuePassTypes {
    DO_NOT_ISSUE = 1000,
    ISSUE_WITHOUT_SUPPORT = 1001,
    ISSUE_WITH_SUPPORT = 1002,
  }

  // accurate data on the number of passports issued on the internet in 100k
  const ACCURATE_ISSUED_PASSPORTS: ObjectNum = {
    Canada: 270,
    China: 2120,
    France: 340,
    Germany: 340,
    Japan: 210,
    'United Kingdom': 510,
    'United States of America': 1670,
  };

  const [allCountriesData, setAllCountriesData] = useState<any>({});
  const [allIssuesCountry, setAllIssuesCountry] = useState<any>({});
  const { isMobile } = useSettings();
  const [countryName, setCountryName] = useState('');

  const formatJsonData = (
    dscInput: any = {},
    cscaInput: any = {},
    countryNames: ObjectStr = {}
  ): any => {
    delete dscInput?.default;
    delete cscaInput?.default;

    const countryData: any = {};

    for (const countryCode of Object.keys(countryNames)) {
      const name = countryNames[countryCode];
      countryData[name] = false;

      // verify specific country having dsc / csca records
      const dscCountryData = dscInput[countryCode];
      const cscaCountryData = cscaInput[countryCode];
      if (dscCountryData?.length || cscaCountryData?.length) {
        const countryObj: any = {};

        countryObj['name'] = name;
        countryObj['countryCode'] = countryCode;
        countryObj['dscExist'] = false;
        countryObj['cscaExist'] = false;

        let count = 0;
        const signatureCountryAlgs: ObjectBool = {};
        if (dscCountryData?.length > 0) {
          countryObj['dscExist'] = true;
          countryObj['dscRecords'] = [...dscCountryData];
          for (const dscEachAlg of dscCountryData) {
            count += dscEachAlg?.amount;
            const signatureStr = `${dscEachAlg.signature_algorithm.toUpperCase()} with ${dscEachAlg.hash_algorithm.toUpperCase()}`;
            const dscSupport = supportIndicator(dscEachAlg);
            if (!signatureCountryAlgs[signatureStr]) {
              signatureCountryAlgs[signatureStr] = false;
            }
            if (dscSupport) {
              signatureCountryAlgs[signatureStr] = true;
            }
            dscEachAlg['is_supported'] = dscSupport;
          }
        }

        if (cscaCountryData?.length > 0) {
          countryObj['cscaExist'] = true;
          countryObj['cscaRecords'] = [...cscaCountryData];
          for (const cscaEachAlg of cscaCountryData) {
            const signatureStr = `${cscaEachAlg.signature_algorithm.toUpperCase()} with ${cscaEachAlg.hash_algorithm.toUpperCase()}`;
            const cscaSupport = supportIndicator(cscaEachAlg, 'csca');
            if (!signatureCountryAlgs[signatureStr]) {
              signatureCountryAlgs[signatureStr] = false;
            }
            if (cscaSupport) {
              signatureCountryAlgs[signatureStr] = true;
            }
            cscaEachAlg['is_supported'] = cscaSupport;
          }
        }
        countryObj['allAlgs'] = Object.entries(signatureCountryAlgs);
        countryObj['amount'] = count;

        countryData[name] = countryObj;
      }
    }

    return countryData;
  };

  const fetchJsonInfo = async () => {
    try {
      // Intermediate Certificates (DSC) issued by each country
      const dscFetchData = await fetch(
        'https://raw.githubusercontent.com/openpassport-org/openpassport/14c42a5ae0f849d1aa7be7afc1745f7e70952ab5/registry/outputs/map_dsc.json'
      );
      const dscData = await dscFetchData.json();

      // Top-level Certificates (CSCA) issued by each country
      // Instead of fetching from remote URL, import the local file
      const cscaData = await import('./../../app/src/map_csca.json');

      const countryNames: any = await import(
        './../../public/data/all-countries.json'
      );

      if (!dscData || !cscaData) {
        return;
      }

      const allCountriesData = formatJsonData(
        { ...dscData },
        { ...cscaData },
        countryNames
      );
      console.log('allCountriesData :>> ', allCountriesData);
      setAllCountriesData(allCountriesData);

      // e-passport supported countries
      let ePassSupportCountries: any = await import(
        './../../public/data/supported-countries.json'
      );
      if (ePassSupportCountries?.default?.length) {
        ePassSupportCountries = ePassSupportCountries.default;
      }

      setIssuesSupportsVisuals(
        allCountriesData,
        ePassSupportCountries,
        countryNames
      );
    } catch (err) {
      console.log('err :>> ', err);
    }
  };

  const setIssuesSupportsVisuals = (
    countryCertsData: any,
    ePassCountries: string[],
    countryNames: { [x: string]: any }
  ) => {
    if (!countryCertsData || !ePassCountries) {
      return;
    }

    // construct obj to find the e-passport supported countries
    const supportedCountriesObj: any = {};
    ePassCountries.forEach((countryCode: string) => {
      supportedCountriesObj[countryCode] = true;
    });

    const countryRes: any = {};
    for (const country of Object.keys(countryNames)) {
      const countryName = countryNames[country];
      const countryData = countryCertsData[countryName];

      // Special case for India - mark as not issuing e-passports
      if (countryName === 'India') {
        countryRes[countryName] = {
          name: countryName,
          issueType: issuePassTypes.DO_NOT_ISSUE,
          defaultColor: '#b0bfa7',
          countryCode: country,
        };
        continue;
      }

      countryRes[countryName] = {
        name: countryName,
        issueType: issuePassTypes.DO_NOT_ISSUE,
        defaultColor: '#b0bfa7',
        countryCode: country,
      };

      // Simplified color logic - check for CSCA support or DSC support
      let hasDscSupport = false;
      let hasCscaSupport = false;

      // Check DSC support
      if (countryData?.dscRecords?.length) {
        for (const alg of countryData.dscRecords) {
          if (supportIndicator(alg, 'dsc')) {
            hasDscSupport = true;
            break;
          }
        }
      }

      // Check CSCA support
      if (countryData?.cscaRecords?.length) {
        for (const alg of countryData.cscaRecords) {
          if (supportIndicator(alg, 'csca')) {
            hasCscaSupport = true;
            break;
          }
        }
      }

      // Set color based on support status - consider a country fully supported if it has CSCA support
      if (hasCscaSupport) {
        countryRes[countryName].issueType = issuePassTypes.ISSUE_WITH_SUPPORT;
        countryRes[countryName].defaultColor = '#548233';
      } else if (hasDscSupport || supportedCountriesObj[country] || countryData?.cscaRecords?.length || countryData?.dscRecords?.length) {
        countryRes[countryName].issueType = issuePassTypes.ISSUE_WITHOUT_SUPPORT;
        countryRes[countryName].defaultColor = '#70ac48';
      }
    }

    setAllIssuesCountry(countryRes);
  };

  useEffect(() => {
    fetchJsonInfo();

    // apply custom styles to map page
    document.body.classList.add('globalMap');
    // Clean up: Remove classes from body
    window.scrollTo({ top: 0, left: 0 });
    return () => {
      document.body.classList.remove('globalMap');
    };
  }, []);

  const formatAlgorithmDetails = (cert: any) => {
    let keyDetails = '';

    if (cert.signature_algorithm === 'rsapss') {
      cert.signature_algorithm = 'rsa-pss';
    }

    const signatureStr = `${cert.hash_algorithm.toLowerCase()} ${cert.signature_algorithm.toLowerCase()}`;

    if (cert.signature_algorithm === 'ecdsa') {
      // Just show the curve name without "curve=" prefix
      keyDetails = `${cert?.curve_exponent}`;
    } else {
      // For RSA/RSA-PSS, keep the e= prefix for exponent
      keyDetails = `e=${cert?.curve_exponent} ${cert?.bit_length}`;
    }

    return {
      signatureStr,
      keyDetails,
      isSupported: cert.is_supported
    };
  };

  const highLightInfo = (countryName: string) => {
    if (!countryName) {
      return;
    }
    let info: React.JSX.Element;
    const countryData = allCountriesData[countryName];
    if (countryData) {
      const accurateCountryCount =
        ACCURATE_ISSUED_PASSPORTS[countryName] || countryData?.amount;
      info = (
        <div className="highlightInfo text-white">
          <h3 className="flex items-center justify-start gap-2 text-white">
            <b>{countryName || ''}</b>
            <ReactCountryFlag
              countryCode={countryData.countryCode}
              svg
              style={{
                width: '1.5em',
                height: '1em',
                verticalAlign: 'middle',
              }}
              title={countryData.name}
            />
          </h3>

          <div className="issued-dscs text-white">
            {accurateCountryCount ? (
              <p className="issuedCount text-white">
                ~ {new Intl.NumberFormat().format(
                  accurateCountryCount
                    ? accurateCountryCount * 100_000
                    : accurateCountryCount
                )}{' '}
                passports issued
              </p>
            ) : null}

            {/* Show CSCA certificates */}
            {countryData?.cscaExist && (
              <div className="text-white">
                <p className="algorithmTitle font-semibold mt-2 text-white">Top-level Certificates (CSCA)</p>
                {countryData?.cscaRecords.map((csca: any, index: number) => {
                  const { signatureStr, keyDetails, isSupported } = formatAlgorithmDetails(csca);

                  return (
                    <p
                      key={`csca-${index}`}
                      className="flex items-center text-nowrap text-white"
                    >
                      &nbsp;-&nbsp;
                      {`${csca?.amount} issued: ${signatureStr} ${keyDetails}`}
                      {isSupported ? '  ✅' : '  🚧'}
                    </p>
                  );
                })}
              </div>
            )}

            {/* Show DSC certificates */}
            {countryData?.dscExist && (
              <div className="text-white">
                <p className="algorithmTitle font-semibold mt-2 text-white">
                  Intermediate Certificates (DSC)
                </p>
                {countryData?.dscRecords.map((dsc: any, index: number) => {
                  const { signatureStr, keyDetails, isSupported } = formatAlgorithmDetails(dsc);

                  return (
                    <p
                      key={`dsc-${index}`}
                      className="flex items-center text-nowrap text-white"
                    >
                      &nbsp;-&nbsp;
                      {`${dsc?.amount} issued: ${signatureStr} ${keyDetails}`}
                      {isSupported ? '  ✅' : '  🚧'}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    } else {
      info = (
        <div className="workInProgress text-white">
          <h3 className="flex items-center justify-start gap-2 text-white">
            <b>{countryName || ''}</b>
            <ReactCountryFlag
              countryCode={allIssuesCountry[countryName]?.countryCode}
              svg
              style={{
                width: '1.5em',
                height: '1em',
                verticalAlign: 'middle',
              }}
              title={countryName}
            />
            {allIssuesCountry[`${countryName}`] ? '🚧' : null}
          </h3>
          {allIssuesCountry[`${countryName}`] && isMobile ? (
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

    return info;
  };

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
                        className=" font-alliance"
                        onClick={() => {
                          if (!isMobile) {
                            return;
                          }
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
                            fill: allIssuesCountry[`${geo.properties.name}`]
                              ? allIssuesCountry[`${geo.properties.name}`]
                                .defaultColor
                              : '#b0bfa7',
                          },
                          hover: {
                            fill: allIssuesCountry[`${geo.properties.name}`]
                              ? '#4d7332'
                              : '#b0bfa7',
                          },
                          pressed: {
                            fill: allIssuesCountry[`${geo.properties.name}`]
                              ? '#507f3a'
                              : '#b0bfa7',
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
          <h2 className={`homeTitle`}>OpenPassport country coverage</h2>
          <div className="legend-info-item flex items-center">
            <p
              className={`w-8 h-4 bg-[#548233] ${isMobile ? 'ms-2' : 'me-2'}`}
            ></p>{' '}
            Fully supported countries
          </div>
          <div className="legend-info-item flex items-center">
            <p
              className={`w-8 h-4 bg-[#70ac48] ${isMobile ? 'ms-2' : 'me-2'}`}
            ></p>{' '}
            Partially supported
          </div>
          <div className="legend-info-item flex items-center">
            <p
              className={`w-8 h-4 bg-[#b0bfa7] ${isMobile ? 'ms-2' : 'me-2'}`}
            ></p>{' '}
            Not issuing e-passport
          </div>
        </Grid>
      </Grid>
    </div>
  );
}
