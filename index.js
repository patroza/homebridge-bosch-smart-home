import { BshbUtils, BoschSmartHomeBridgeBuilder, DefaultLogger } from "bosch-smart-home-bridge";

import fs from "fs"

const getOrGenerateCertificate = () => {
  if (fs.existsSync('client-cert.pem') && fs.existsSync('client-cert-private.pem')) {
    return {
      cert: fs.readFileSync('client-cert.pem'),
      private: fs.readFileSync('client-cert-private.pem'),
    };
  }
  // TODO: store the certificate, and re-use, so only generate if needed..
const certificate = BshbUtils.generateClientCertificate();
fs.writeFileSync('client-cert.pem', certificate.cert);
fs.writeFileSync('client-cert-private.pem', certificate.private);
return certificate
}

const certificate = getOrGenerateCertificate();
const bshb = BoschSmartHomeBridgeBuilder.builder()
    .withHost('192.168.178.93')
    .withClientCert(certificate.cert)
    .withClientPrivateKey(certificate.private)
    .withLogger(new DefaultLogger())
    .build();


const identifier = BshbUtils.generateIdentifier();
bshb.pairIfNeeded('hoobs', identifier, JSON.parse(fs.readFileSync('password.json', 'utf-8'))).subscribe(
  // {
  //     next: value => expect.fail('Expected not connected'),
  //     error: error => {
  //       expect(error).not.to.be.null;
  //       done();
  //     },
  //     complete: () => {
  //       expect.fail('Expected not connected');
  //     },
  //   }
  );

  setInterval(() => {
      bshb
    .getBshcClient()
    .getDevice()
    .subscribe(device => {
      const plugs = device.parsedResponse.filter(_ => _.deviceModel === "PLUG_COMPACT")
      // Do something with the device information
      fs.writeFileSync("devices.json", JSON.stringify(plugs, null, 2));
    bshb
    .getBshcClient()
    .getDeviceServices(undefined, "PowerMeter")
    .subscribe(response => {
      const allPowerMeters = response.parsedResponse.filter(_ => _.state && _.state['@type'] === "powerMeterState")
      // type Plug = {
      //   name: string
      //   serial: string
      //   id: string
      //   state: {
      //     powerConsumption: number,
      //     energyConsumption: number,
      //     energyConsumptionStartDate: string  // '2025-08-02T06:48:53Z'
      //   }
      // }
      const data = plugs.map(p => ({...p, state: allPowerMeters.find(_ => _.deviceId === p.id)?.state }))
          console.log("Response", data)
  })

    });
  }, 10_000)

bshb
    .getBshcClient()
  //  .subscribe()
    .subscribe(response => {
        bshb
            .getBshcClient()
            .longPolling(response.parsedResponse.result)
            .subscribe(info => {

                // do something with the information
                // also you need to call longPolling again after connection close
            });
    });