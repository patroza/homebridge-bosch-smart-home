import {
  Service,
  PlatformAccessory,
  CharacteristicValue,
  CharacteristicSetCallback,
  CharacteristicGetCallback,
} from "homebridge";

import Platform, { PlugBase } from "./platform";
import { BoschSmartHomeBridge } from "bosch-smart-home-bridge";
//import FakeGatoHistoryService from 'fakegato-history';

export default class Accessory {
  private service: Service;

  private states = {
    powerConsumption: 0,
    totalConsumption: 0,
  };

  constructor(
    private readonly platform: Platform,
    private readonly accessory: PlatformAccessory<{ device: PlugBase }>,
    private readonly bshb: BoschSmartHomeBridge,
  ) {
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, "Bosch")
      .setCharacteristic(this.platform.Characteristic.Model, "Energy Meter")
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        accessory.context.device.id,
      );
    //   var EveTotalConsumption = function () {
    //     Characteristic.call(this, 'Energy', 'E863F10C-079E-48FF-8F27-9C2605A29F52');
    //     this.setProps({
    //       format: Characteristic.Formats.FLOAT,
    //       unit: 'kWh',
    //       maxValue: 1000000000,
    //       minValue: 0,
    //       minStep: 0.001,
    //       perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    //     });
    //     this.value = this.getDefaultValue();
    //   };

    class EveTotalConsumption extends this.platform.Characteristic {
      static readonly UUID = "E863F10C-079E-48FF-8F-8F27-9C2605A29F52";

      constructor() {
        super("Energy", EveTotalConsumption.UUID, {
          format: platform.Characteristic.Formats.FLOAT,
          unit: "kWh",
          maxValue: 1000000000,
          minValue: 0,
          minStep: 0.001,
          perms: [
            platform.Characteristic.Perms.READ,
            platform.Characteristic.Perms.NOTIFY,
          ],
        });
        this.value = this.getDefaultValue();
      }
    }
    class EvePowerConsumption extends this.platform.Characteristic {
      static readonly UUID = "E863F10D-079E-48FF-8F27-9C2605A29F52";

      constructor() {
        super("Power Consumption", EvePowerConsumption.UUID, {
          format: platform.Characteristic.Formats.UINT16,
          unit: "W",
          perms: [
            platform.Characteristic.Perms.READ,
            platform.Characteristic.Perms.NOTIFY,
          ],
        });
        this.value = this.getDefaultValue();
      }
    }

    class PowerMeterService extends this.platform.Service {
      static readonly UUID = "00000001-0000-1777-8000-775D67EC4377";

      constructor(displayName: string, subtype?: string) {
        super(displayName, PowerMeterService.UUID, subtype);
        this.addCharacteristic(EvePowerConsumption);
        this.addOptionalCharacteristic(EveTotalConsumption);
      }
    }

    // info
    //   this.informationService = new Service.AccessoryInformation();
    //   this.informationService
    //       .setCharacteristic(Characteristic.Manufacturer, "Bosch")
    //       .setCharacteristic(Characteristic.Model, "Bosch Compact Plug")
    //       .setCharacteristic(Characteristic.FirmwareRevision, version)
    //       .setCharacteristic(Characteristic.SerialNumber, this.serial);

    //   // construct service
    this.service = new PowerMeterService(this.accessory.displayName);
    this.service
      .getCharacteristic(EvePowerConsumption)
      .on("get", (callback) => callback(null, this.states.powerConsumption));
    this.service
      .addCharacteristic(EveTotalConsumption)
      .on("get", (callback) => callback(null, this.states.totalConsumption));

    //this.historyService = new FakeGatoHistoryService("energy", this,{storage:'fs'});

    // template:
    // this.service =
    //   this.accessory.getService(this.platform.Service.Lightbulb) ||
    //   this.accessory.addService(this.platform.Service.Lightbulb);
    // this.service.setCharacteristic(
    //   this.platform.Characteristic.Name,
    //   accessory.context.device.DisplayName
    // );

    // this.service
    //   .getCharacteristic(this.platform.Characteristic.On)
    //   .on("set", this.setOn.bind(this))
    //   .on("get", this.getOn.bind(this));

    // this.service
    //   .getCharacteristic(this.platform.Characteristic.Brightness)
    //   .on("set", this.setBrightness.bind(this));

    // const motionSensorOneService =
    //   this.accessory.getService("Motion Sensor One Name") ||
    //   this.accessory.addService(
    //     this.platform.Service.MotionSensor,
    //     "Motion Sensor One Name",
    //     "YourUniqueIdentifier-1"
    //   );
    // const motionSensorTwoService =
    //   this.accessory.getService("Motion Sensor Two Name") ||
    //   this.accessory.addService(
    //     this.platform.Service.MotionSensor,
    //     "Motion Sensor Two Name",
    //     "YourUniqueIdentifier-2"
    //   );

    // let motionDetected = false;

    // TODO: clear on destruction?

    setInterval(() => {
      bshb
        .getBshcClient()
        .getDeviceServices(this.accessory.context.device.id, "PowerMeter")
        .subscribe((response) => {
          const allPowerMeters = response.parsedResponse.filter(
            (_) => _.state && _.state["@type"] === "powerMeterState",
          ); // TODO: do request with bosch sdk, and set values
          const powerConsumption = Math.abs(
            parseFloat(allPowerMeters[0].state.powerConsumption),
          );
          const totalPowerConsumption = Math.abs(
            parseFloat(allPowerMeters[0].state.energyConsumption) / 1000,
          );
          this.states.powerConsumption = powerConsumption;
          this.states.totalConsumption = totalPowerConsumption;
          if (powerConsumption != null) {
            this.service
              .getCharacteristic(EvePowerConsumption)
              .setValue(powerConsumption, undefined, undefined);
          }
          //FakeGato
          // this.historyService.addEntry({time: Math.round(new Date().valueOf() / 1000), power: powerConsumption});}
          if (totalPowerConsumption != null) {
            this.service
              .getCharacteristic(EveTotalConsumption)
              .setValue(totalPowerConsumption, undefined, undefined);
          }

          // resolve(powerConsumption,totalPowerConsumption)
          //  this.waiting_response = false;

          // TODO: handle errors this.log('Error processing data: ' + parseErr.message);
          //  if (this.debug_log) { this.log('Successful http response. [ voltage: ' + this.voltage1.toFixed(0) + 'V, current: ' + this.ampere1.toFixed(1) + 'A, consumption: ' + this.powerConsumption.toFixed(0) + 'W, total consumption: ' + this.totalPowerConsumption.toFixed(2) + 'kWh ]'); }
        });
    }, 10000);
  }
}
