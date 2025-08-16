import type { IDeliveryAgency, DeliveryAgencyConfig } from "./types"
import { BestDeliveryAgency } from "./agencies/best-delivery"
import { prismaClient } from "../prisma"

export class DeliveryAgencyRegistry {
  private static instance: DeliveryAgencyRegistry
  private agencies: Map<string, IDeliveryAgency> = new Map()
  private configs: Map<string, DeliveryAgencyConfig> = new Map()
  private initialized = false

  private constructor() {
    this.initialize()
  }

  public static getInstance(): DeliveryAgencyRegistry {
    if (!DeliveryAgencyRegistry.instance) {
      DeliveryAgencyRegistry.instance = new DeliveryAgencyRegistry()
    }
    return DeliveryAgencyRegistry.instance
  }

  private async initialize() {
    if (this.initialized) return

    console.log("🔄 Initializing delivery agency registry...")

    // Register built-in agencies
    await this.registerDefaultAgencies()

    // Load configurations from database
    await this.loadConfigurationsFromDatabase()

    this.initialized = true
    console.log("✅ Delivery agency registry initialized")
  }

  private async registerDefaultAgencies() {
    // Register Best Delivery
    const bestDelivery = new BestDeliveryAgency()
    this.agencies.set(bestDelivery.id, bestDelivery)
    console.log(`✅ Registered delivery agency: ${bestDelivery.name}`)
  }

  private async loadConfigurationsFromDatabase() {
    try {
      const dbAgencies = await prismaClient.deliveryAgency.findMany()

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
          settings: dbAgency.settings || {},
          webhookUrl: dbAgency.webhookUrl || undefined,
          pollingInterval: dbAgency.pollingInterval,
        }

        this.configs.set(dbAgency.id, config)
        console.log(`📋 Loaded config for delivery agency: ${dbAgency.name}`)
      }
    } catch (error) {
      console.error("❌ Failed to load delivery agency configurations:", error)
    }
  }

  public registerAgency(agency: IDeliveryAgency, config: DeliveryAgencyConfig) {
    this.agencies.set(agency.id, agency)
    this.configs.set(agency.id, config)
    console.log(`✅ Registered delivery agency: ${agency.name}`)
  }

  public getAgency(id: string): IDeliveryAgency | undefined {
    return this.agencies.get(id)
  }

  public getAgencyConfig(id: string): DeliveryAgencyConfig | undefined {
    return this.configs.get(id)
  }

  public getAllAgencies(): IDeliveryAgency[] {
    return Array.from(this.agencies.values())
  }

  public getEnabledAgencies(): Array<{ agency: IDeliveryAgency; config: DeliveryAgencyConfig }> {
    const enabled: Array<{ agency: IDeliveryAgency; config: DeliveryAgencyConfig }> = []

    for (const [id, agency] of this.agencies) {
      const config = this.configs.get(id)
      if (config && config.enabled) {
        enabled.push({ agency, config })
      }
    }

    return enabled
  }

  public async updateAgencyConfig(id: string, configUpdate: Partial<DeliveryAgencyConfig>) {
    const existingConfig = this.configs.get(id)
    if (!existingConfig) {
      console.error(`❌ Agency config not found: ${id}`)
      return
    }

    const updatedConfig = { ...existingConfig, ...configUpdate }
    this.configs.set(id, updatedConfig)

    // Update in database
    try {
      await prismaClient.deliveryAgency.update({
        where: { id },
        data: {
          enabled: updatedConfig.enabled,
          credentialsType: updatedConfig.credentials.type,
          credentialsUsername: updatedConfig.credentials.username || null,
          credentialsEmail: updatedConfig.credentials.email || null,
          credentialsPassword: updatedConfig.credentials.password || null,
          credentialsApiKey: updatedConfig.credentials.apiKey || null,
          settings: updatedConfig.settings,
          webhookUrl: updatedConfig.webhookUrl || null,
          pollingInterval: updatedConfig.pollingInterval || 30,
        },
      })
      console.log(`✅ Updated config for delivery agency: ${id}`)
    } catch (error) {
      console.error(`❌ Failed to update delivery agency config in database: ${id}`, error)
    }
  }

  public isAgencyEnabled(id: string): boolean {
    const config = this.configs.get(id)
    return config?.enabled || false
  }

  public getAgenciesByRegion(region: string): Array<{ agency: IDeliveryAgency; config: DeliveryAgencyConfig }> {
    return this.getEnabledAgencies().filter(({ agency }) => agency.supportedRegions.includes(region))
  }

  public async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }
  }
}

// Export singleton instance
export const deliveryRegistry = DeliveryAgencyRegistry.getInstance()
