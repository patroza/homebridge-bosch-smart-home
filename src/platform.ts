import type {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from "homebridge";

import { PLATFORM_NAME, PLUGIN_NAME } from "./settings";
import { Accessory } from "./accessory";

import {
  BshbUtils,
  BoschSmartHomeBridgeBuilder,
  DefaultLogger,
  BoschSmartHomeBridge,
} from "bosch-smart-home-bridge";


export type PlugBase = { id: string; name: string; serial: string };

export class BoschPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;

  public readonly Characteristic: typeof Characteristic =
    this.api.hap.Characteristic;

  public readonly accessories: PlatformAccessory<{ device: PlugBase }>[] = [];

  private bshb!: BoschSmartHomeBridge;

  public readonly  PowerMeterService: typeof Service.PowerManagement;

  // bs
  public readonly EveTotalConsumption: typeof Characteristic.CarbonDioxidePeakLevel;

  public readonly EvePowerConsumption: typeof Characteristic.CarbonDioxidePeakLevel;

  public readonly EveVoltage1: typeof Characteristic.CarbonDioxidePeakLevel;

  public readonly EveAmperage1: typeof Characteristic.CarbonDioxidePeakLevel;
  
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

    this.log.debug("Finished initializing platform:", this.config.name);

    class EveTotalConsumption extends this.api.hap.Characteristic {
      static readonly UUID = "E863F10C-079E-48FF-8F27-9C2605A29F52";

      constructor() {
        super("Energy", EveTotalConsumption.UUID, {
          format: api.hap.Characteristic.Formats.FLOAT,
          unit: "kWh",
          maxValue: 1000000000,
          minValue: 0,
          minStep: 0.001,
          perms: [
            api.hap.Characteristic.Perms.READ,
            api.hap.Characteristic.Perms.NOTIFY,
          ],
        });
        this.value = this.getDefaultValue();
      }
    }

    this.EveTotalConsumption = EveTotalConsumption;

    // 
    // var EveVoltage1 = function () {
    // 	Characteristic.call(this, 'Volt', 'E863F10A-079E-48FF-8F27-9C2605A29F52');
    // 	this.setProps({
    // 		format: Characteristic.Formats.FLOAT,
    // 		unit: 'Volt',
    // 		maxValue: 1000000000,
    // 		minValue: 0,
    // 		minStep: 0.001,
    // 		perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    // 	});
    // 	this.value = this.getDefaultValue();
    // };
    // EveVoltage1.UUID = 'E863F10A-079E-48FF-8F27-9C2605A29F52';
    // inherits(EveVoltage1, Characteristic);

    // var EveAmpere1 = function () {
    // 	Characteristic.call(this, 'Ampere', 'E863F126-079E-48FF-8F27-9C2605A29F52');
    // 	this.setProps({
    // 		format: Characteristic.Formats.FLOAT,
    // 		unit: 'Ampere',
    // 		maxValue: 1000000000,
    // 		minValue: 0,
    // 		minStep: 0.001,
    // 		perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    // 	});
    // 	this.value = this.getDefaultValue();
    // };
    // EveAmpere1.UUID = 'E863F126-079E-48FF-8F27-9C2605A29F52';
    // inherits(EveAmpere1, Characteristic);
    
    class EveVoltage1 extends this.api.hap.Characteristic {
      static readonly UUID = "E863F10A-079E-48FF-8F27-9C2605A29F52";

      constructor() {
        super("Volt", EveVoltage1.UUID, {
          format: api.hap.Characteristic.Formats.FLOAT,
          unit: "Volt",
          maxValue: 1000000000,
          minValue: 0,
          minStep: 0.001,
          perms: [
            api.hap.Characteristic.Perms.READ,
            api.hap.Characteristic.Perms.NOTIFY,
          ],
        });
        this.value = this.getDefaultValue();
      }
    }

    class EveAmpere1 extends this.api.hap.Characteristic {
      static readonly UUID = "E863F126-079E-48FF-8F27-9C2605A29F52";

      constructor() {
        super("Ampere", EveAmpere1.UUID, {
          format: api.hap.Characteristic.Formats.FLOAT,
          unit: "Ampere",
          maxValue: 1000000000,
          minValue: 0,
          minStep: 0.001,
          perms: [
            api.hap.Characteristic.Perms.READ,
            api.hap.Characteristic.Perms.NOTIFY,
          ],
        });
        this.value = this.getDefaultValue();
      }
    } 

    this.EveAmperage1 = EveAmpere1;
    this.EveVoltage1 = EveVoltage1;
  
    class EvePowerConsumption extends this.api.hap.Characteristic {
      static readonly UUID = "E863F10D-079E-48FF-8F27-9C2605A29F52";

      constructor() {
        super("Power Consumption", EvePowerConsumption.UUID, {
          format: api.hap.Characteristic.Formats.UINT16,
          unit: "W",
          perms: [
            api.hap.Characteristic.Perms.READ,
            api.hap.Characteristic.Perms.NOTIFY,
          ],
        });
        this.value = this.getDefaultValue();
      }
    }

    this.EvePowerConsumption = EvePowerConsumption;

    this.PowerMeterService = class PowerMeterService  extends this.api.hap.Service {
      static readonly UUID = "00000001-0000-1777-8000-775D67EC4377";
  
      constructor(displayName: string, subtype?: string) {
        super(displayName, PowerMeterService.UUID, subtype);
        this.addCharacteristic(EvePowerConsumption);
        this.addOptionalCharacteristic(EveTotalConsumption);
        this.addOptionalCharacteristic(EveAmpere1);
        this.addOptionalCharacteristic(EveVoltage1);
      }
    };

    this.api.on("didFinishLaunching", () => {
      log.debug("Executed didFinishLaunching callback");
      log.info("Finish launching?");
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

    this.accessories.push(accessory);
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
    }, error: (error) => this.log.error("Error fetching devices", error), complete: () => this.log.info("Fetch devices complete") });
  }
}
