import type {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from "homebridge";

import { PLATFORM_NAME, PLUGIN_NAME } from "./settings.js";
import { Accessory } from "./accessory.js";

import {
  BshbUtils,
  BoschSmartHomeBridgeBuilder,
  DefaultLogger,
  BoschSmartHomeBridge,
} from "bosch-smart-home-bridge";

import { EveHomeKitTypes } from "homebridge-lib/EveHomeKitTypes";


export type PlugBase = { id: string; name: string; serial: string };

export class BoschPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;

  public readonly Characteristic: typeof Characteristic;

  public readonly accessories: Map<string, PlatformAccessory<{ device: PlugBase }>> = new Map();

  private bshb!: BoschSmartHomeBridge;

  private readonly discoveredCacheUUIDs: string[] = [];

  // This is only required when using Custom Services and Characteristics not support by HomeKit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly CustomServices: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly CustomCharacteristics: any;
  
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
    log.info("loading..");

    this.Service = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;

    this.log.debug("Finished initializing platform:", this.config.name);

    // This is only required when using Custom Services and Characteristics not support by HomeKit
    this.CustomServices = new EveHomeKitTypes(this.api).Services;
    this.CustomCharacteristics = new EveHomeKitTypes(this.api).Characteristics;

    this.api.on("didFinishLaunching", () => {
      log.debug("Executed didFinishLaunching callback");
      if (!this.config.bridgeIp || !this.config.clientCert || !this.config.clientKey || !this.config.bridgePassword) {
        this.log.error("Please check your config.json. Missing bridgeIp or clientCert or clientKey or bridgePassword");
        return;
      }

      this.log.info("building BSHB client");
      this.bshb = BoschSmartHomeBridgeBuilder.builder()
        .withHost(config.bridgeIp)
        .withClientCert(config.clientCert)
        .withClientPrivateKey(config.clientKey)
        .withLogger(new DefaultLogger())
        .build();

      const identifier = BshbUtils.generateIdentifier();
      this.bshb.pairIfNeeded("hoobs", identifier, config.bridgePassword).subscribe({
        next: () => this.log.info("pair next"),
        error: (error) => this.log.error("Error pairing", error),
        complete: () => this.log.info("pair complete"),
      });


      // todo wait until pair is complete?
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory<{ device: PlugBase }>): void {
    this.log.info("Loading accessory from cache:", accessory.displayName);

    // in discovery we will find it as existing accessory and set it up accordingly..
    this.accessories.set(accessory.UUID, accessory);
  }

  discoverDevices() {
    this.log.info("Discovering devices...");
    const client = this.bshb.getBshcClient();
    return client.getDevice().subscribe({ next: (d) => {
      const devices: Plug[] = d.parsedResponse.filter((_) => _.deviceModel === "PLUG_COMPACT");
      this.log.info(`Found ${devices.length} devices`, devices);
      // client
      //   .getDeviceServices(undefined, "PowerMeter")
      //   .subscribe((response) => {
      //     const allPowerMeters = response.parsedResponse.filter(
      //       (_) => _.state && _.state["@type"] === "powerMeterState",
      //     );
          type Plug = {
            name: string;
            serial: string;
            id: string;
            // state: {
            //   powerConsumption: number;
            //   energyConsumption: number;
            //   energyConsumptionStartDate: string; // '2025-08-02T06:48:53Z'
            // };
          };
          // const devices: Plug[] = plugs.map((p) => ({
          //   ...p,
          //   state: allPowerMeters.find((_) => _.deviceId === p.id)?.state,
          // }));

          for (const device of devices) {
            const uuid = this.api.hap.uuid.generate(device.serial);
            const existingAccessory = this.accessories.get(uuid);

            if (existingAccessory) {
              this.log.info(
                "Restoring existing accessory from cache:",
                existingAccessory.displayName,
              );

              new Accessory(this, existingAccessory, this.bshb);

              this.api.updatePlatformAccessories([existingAccessory]);
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
            
            // push into discoveredCacheUUIDs
            this.discoveredCacheUUIDs.push(uuid);
          }

          // you can also deal with accessories from the cache which are no longer present by removing them from Homebridge
          // for example, if your plugin logs into a cloud account to retrieve a device list, and a user has previously removed a device
          // from this cloud account, then this device will no longer be present in the device list but will still be in the Homebridge cache
          for (const [uuid, accessory] of this.accessories) {
            if (!this.discoveredCacheUUIDs.includes(uuid)) {
              this.log.info("Removing existing accessory from cache:", accessory.displayName);
              this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
            }
          }
    }, error: (error) => this.log.error("Error fetching devices", error), complete: () => this.log.info("Fetch devices complete") });
  }
}
