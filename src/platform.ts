import {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from "homebridge";

import { PLATFORM_NAME, PLUGIN_NAME } from "./settings";
import Accessory from "./accessory";

import {
  BshbUtils,
  BoschSmartHomeBridgeBuilder,
  DefaultLogger,
  BoschSmartHomeBridge,
} from "bosch-smart-home-bridge";

import fs from "fs";

export type PlugBase = { id: string; name: string; serial: string };

export default class Platform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;

  public readonly Characteristic: typeof Characteristic =
    this.api.hap.Characteristic;

  public readonly accessories: PlatformAccessory<{ device: PlugBase }>[] = [];

  private readonly bshb: BoschSmartHomeBridge;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig & {
      clientCert: string;
      clientKey: string;
      bridgePassword: string;
      bridgeIp: string;
    },
    public readonly api: API,
  ) {
    this.bshb = BoschSmartHomeBridgeBuilder.builder()
      .withHost(config.bridgeIp)
      .withClientCert(config.clientCert)
      .withClientPrivateKey(config.clientKey)
      .withLogger(new DefaultLogger())
      .build();

    const identifier = BshbUtils.generateIdentifier();
    this.bshb.pairIfNeeded("hoobs", identifier, config.password).subscribe();

    this.log.debug("Finished initializing platform:", this.config.name);

    this.api.on("didFinishLaunching", () => {
      log.debug("Executed didFinishLaunching callback");

      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory<{ device: PlugBase }>): void {
    this.log.info("Loading accessory from cache:", accessory.displayName);

    this.accessories.push(accessory);
  }

  discoverDevices(): void {
    const client = this.bshb.getBshcClient();
    client.getDevice().subscribe((d) => {
      const plugs = d.parsedResponse.filter((_) => _.d === "PLUG_COMPACT");
      client
        .getDeviceServices(undefined, "PowerMeter")
        .subscribe((response) => {
          const allPowerMeters = response.parsedResponse.filter(
            (_) => _.state && _.state["@type"] === "powerMeterState",
          );
          type Plug = {
            name: string;
            serial: string;
            id: string;
            state: {
              powerConsumption: number;
              energyConsumption: number;
              energyConsumptionStartDate: string; // '2025-08-02T06:48:53Z'
            };
          };
          const devices: Plug[] = plugs.map((p) => ({
            ...p,
            state: allPowerMeters.find((_) => _.deviceId === p.id)?.state,
          }));

          for (let i = 0; i < devices.length; i += 1) {
            const device = devices[i];

            const uuid = this.api.hap.uuid.generate(device.serial);
            const existingAccessory = this.accessories.find(
              (accessory) => accessory.UUID === uuid,
            );

            if (existingAccessory) {
              if (device) {
                this.log.info(
                  "Restoring existing accessory from cache:",
                  existingAccessory.displayName,
                );

                new Accessory(this, existingAccessory, this.bshb);

                this.api.updatePlatformAccessories([existingAccessory]);
              } else if (!device) {
                this.api.unregisterPlatformAccessories(
                  PLUGIN_NAME,
                  PLATFORM_NAME,
                  [existingAccessory],
                );
                this.log.info(
                  "Removing existing accessory from cache:",
                  existingAccessory.displayName,
                );
              }
            } else {
              this.log.info("Adding new accessory:", device.name);

              const accessory = new this.api.platformAccessory<{
                device: { id: string; name: string; serial: string };
              }>(device.name, uuid);

              accessory.context.device = device;

              new Accessory(this, accessory, this.bshb);

              this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
                accessory,
              ]);
            }
          }
        });
    });
  }
}
