import type { IDeliveryAgency, DeliveryAgencyConfig } from './types';
import { BestDeliveryAgency } from './agencies/best-delivery';
import prisma from '@/lib/prisma';

export class DeliveryAgencyRegistry {
  private static instance: DeliveryAgencyRegistry;
  private agencies = new Map<string, IDeliveryAgency>();
  private configs = new Map<string, DeliveryAgencyConfig>();
  private initialized = false;

  private constructor() { }

  public static getInstance(): DeliveryAgencyRegistry {
    if (!DeliveryAgencyRegistry.instance) {
      DeliveryAgencyRegistry.instance = new DeliveryAgencyRegistry();
    }
    return DeliveryAgencyRegistry.instance;
  }

  public async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    console.log('🔄 Initializing delivery agencies...');

    // Register built-in agencies
    this.registerDefaultAgencies();

    // Load configs from database
    await this.loadConfigurations();

    this.initialized = true;
    console.log('✅ Delivery agencies initialized');
  }

  private registerDefaultAgencies() {
    const bestDelivery = new BestDeliveryAgency();
    this.agencies.set(bestDelivery.id, bestDelivery);
    console.log(`✅ Registered: ${bestDelivery.name}`);
  }

  private async loadConfigurations() {
    try {
      const dbAgencies = await prisma.deliveryAgency.findMany();

      for (const dbAgency of dbAgencies) {
        const config: DeliveryAgencyConfig = {
          id: dbAgency.id,
          name: dbAgency.name,
          enabled: dbAgency.enabled,
          credentials: {
            type: dbAgency.credentialsType,
            username: dbAgency.credentialsUsername || undefined,
            email: dbAgency.credentialsEmail || undefined,
            password: dbAgency.credentialsPassword || undefined,
            apiKey: dbAgency.credentialsApiKey || undefined,
          },
          settings: dbAgency.settings as Record<string, any> || {},
          pollingInterval: dbAgency.pollingInterval,
        };
        console.log(`🔍 Loading config for agency: ${dbAgency.name} - dbAgency credentialsType: ${dbAgency.credentialsType}`);

        this.configs.set(dbAgency.id, config);
        console.log(`📋 Loaded config: ${dbAgency.name} with configs: ${config.credentials.type}`);
      }
    } catch (error) {
      console.error('❌ Failed to load agency configs:', error);
    }
  }

  public getAgency(id: string): IDeliveryAgency | null {
    console.log(`🔍 Getting agency: ${id} from agencies: `, this.agencies);
    return this.agencies.get(id) || null;
  }

  public getAgencyConfig(id: string): DeliveryAgencyConfig | null {
    return this.configs.get(id) || null;
  }

  public getAllAgencies(): IDeliveryAgency[] {
    return Array.from(this.agencies.values());
  }

  public getEnabledAgencies(): Array<{ agency: IDeliveryAgency; config: DeliveryAgencyConfig; }> {
    const enabled: Array<{ agency: IDeliveryAgency; config: DeliveryAgencyConfig; }> = [];

    for (const [id, agency] of this.agencies) {
      const config = this.configs.get(id);
      if (config?.enabled) {
        enabled.push({ agency, config });
      }
    }

    return enabled;
  }

  public async updateAgencyConfig(id: string, updates: Partial<DeliveryAgencyConfig>): Promise<void> {
    const existingConfig = this.configs.get(id);
    if (!existingConfig) {
      throw new Error(`Agency config not found: ${id}`);
    }

    const updatedConfig = { ...existingConfig, ...updates };
    this.configs.set(id, updatedConfig);

    console.log(`🔄 Updating config for agency: ${id} - New config:`, updatedConfig);

    // Update in database
    await prisma.deliveryAgency.update({
      where: { id },
      data: {
        enabled: updatedConfig.enabled,
        credentialsUsername: updatedConfig.credentials.username || null,
        credentialsEmail: updatedConfig.credentials.email || null,
        credentialsPassword: updatedConfig.credentials.password || null,
        credentialsApiKey: updatedConfig.credentials.apiKey || null,
        settings: updatedConfig.settings || {},
        pollingInterval: updatedConfig.pollingInterval,
      },
    });

    console.log(`✅ Updated config: ${id}`);
  }

  public isAgencyEnabled(id: string): boolean {
    return this.configs.get(id)?.enabled || false;
  }
}

// Export singleton instance
export const deliveryRegistry = DeliveryAgencyRegistry.getInstance();