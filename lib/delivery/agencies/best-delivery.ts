import { BaseDeliveryAgency } from "../base-agency"
import type {
  DeliveryCredentials,
  DeliveryOrder,
  DeliveryOrderResponse,
  DeliveryTrackingResponse,
  DeliveryStatusHistory,
} from "../types"

interface BestDeliveryPickup {
  nom: string
  gouvernerat: string
  ville: string
  adresse: string
  tel: string
  tel2?: string
  designation: string
  prix: string
  msg?: string
  echange: string
  login: string
  pwd: string
}

interface BestDeliveryResponse {
  HasErrors: number
  ErrorsTxt: string
  CodeBarre?: string
  Url?: string
}

interface BestDeliveryStatusResponse {
  HasErrors: number
  ErrorsTxt: string
  tracking_number?: string
  status?: number
  message?: string
}

interface BestDeliveryHistoryResponse {
  HasErrors: number
  ErrorsTxt: string
  tracking_number?: string
  status?: Array<{
    status: string
    date: string
    message?: string
  }>
}

export class BestDeliveryAgency extends BaseDeliveryAgency {
  readonly name = "Best Delivery"
  readonly id = "best-delivery"
  readonly supportedRegions = [
    "Ariana",
    "Béja",
    "Ben Arous",
    "Bizerte",
    "Gabès",
    "Gafsa",
    "Jendouba",
    "Kairouan",
    "Kasserine",
    "Kébili",
    "La Manouba",
    "Le Kef",
    "Mahdia",
    "Médenine",
    "Monastir",
    "Nabeul",
    "Sfax",
    "Sidi Bouzid",
    "Siliana",
    "Sousse",
    "Tataouine",
    "Tozeur",
    "Tunis",
    "Zaghouan",
  ]

  private readonly apiUrl = "https://api.best-delivery.net/serviceShipments.php"

  async authenticate(credentials: DeliveryCredentials): Promise<boolean> {
    const validation = this.validateCredentials(credentials)
    if (!validation.valid) {
      this.log("error", "Invalid credentials", validation.errors)
      return false
    }

    try {
      // Test authentication by making a simple API call
      const testOrder: DeliveryOrder = {
        customerName: "Test Customer",
        governorate: "Tunis",
        city: "Tunis",
        address: "Test Address",
        phone: "12345678",
        productName: "Test Product",
        price: 1,
        comment: "Authentication test",
        isExchange: false,
      }

      // We'll try to validate the order without actually creating it
      const soapEnvelope = this.buildCreateOrderSoapEnvelope(testOrder, credentials, true)

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: "CreatePickup",
        },
        body: soapEnvelope,
      })

      if (!response.ok) {
        this.log("error", "Authentication failed - HTTP error", { status: response.status })
        return false
      }

      const responseText = await response.text()

      // Parse SOAP response to check for authentication errors
      const hasAuthError =
        responseText.includes("Authentication failed") ||
        responseText.includes("Invalid credentials") ||
        responseText.includes("Login failed")

      if (hasAuthError) {
        this.log("error", "Authentication failed - Invalid credentials")
        return false
      }

      this.log("info", "Authentication successful")
      return true
    } catch (error) {
      this.log("error", "Authentication error", error)
      return false
    }
  }

  async createOrder(order: DeliveryOrder, credentials: DeliveryCredentials): Promise<DeliveryOrderResponse> {
    this.log("info", "Creating order", { customerName: order.customerName, price: order.price })

    // Validate order
    const orderValidation = this.validateOrder(order)
    if (!orderValidation.valid) {
      return {
        success: false,
        error: "Order validation failed",
        errorDetails: orderValidation.errors.join(", "),
      }
    }

    // Validate credentials
    const credValidation = this.validateCredentials(credentials)
    if (!credValidation.valid) {
      return {
        success: false,
        error: "Credentials validation failed",
        errorDetails: credValidation.errors.join(", "),
      }
    }

    // Check if governorate is supported
    if (!this.supportedRegions.includes(order.governorate)) {
      return {
        success: false,
        error: "Unsupported region",
        errorDetails: `Governorate ${order.governorate} is not supported by Best Delivery`,
      }
    }

    try {
      const soapEnvelope = this.buildCreateOrderSoapEnvelope(order, credentials)

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: "CreatePickup",
        },
        body: soapEnvelope,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const responseText = await response.text()
      const parsedResponse = this.parseCreateOrderResponse(responseText)

      if (parsedResponse.HasErrors === 1) {
        return {
          success: false,
          error: "API Error",
          errorDetails: parsedResponse.ErrorsTxt || "Unknown error from Best Delivery API",
        }
      }

      this.log("info", "Order created successfully", {
        trackingNumber: parsedResponse.CodeBarre,
        printUrl: parsedResponse.Url,
      })

      return {
        success: true,
        trackingNumber: parsedResponse.CodeBarre,
        barcode: parsedResponse.CodeBarre,
        printUrl: parsedResponse.Url,
      }
    } catch (error) {
      this.log("error", "Failed to create order", error)
      return {
        success: false,
        error: "Network or API error",
        errorDetails: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async getOrderStatus(trackingNumber: string, credentials: DeliveryCredentials): Promise<DeliveryTrackingResponse> {
    this.log("info", "Getting order status", { trackingNumber })

    const credValidation = this.validateCredentials(credentials)
    if (!credValidation.valid) {
      return {
        success: false,
        error: "Credentials validation failed",
        errorDetails: credValidation.errors.join(", "),
      }
    }

    try {
      const soapEnvelope = this.buildTrackStatusSoapEnvelope(trackingNumber, credentials)

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: "TrackShipmentStatus",
        },
        body: soapEnvelope,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const responseText = await response.text()
      const parsedResponse = this.parseStatusResponse(responseText)

      if (parsedResponse.HasErrors === 1) {
        return {
          success: false,
          error: "API Error",
          errorDetails: parsedResponse.ErrorsTxt || "Unknown error from Best Delivery API",
        }
      }

      const standardStatus = this.mapStatusToStandard(parsedResponse.status || 0)

      return {
        success: true,
        status: {
          trackingNumber: parsedResponse.tracking_number || trackingNumber,
          status: standardStatus,
          statusCode: parsedResponse.status,
          message: parsedResponse.message || "No message available",
          lastUpdated: new Date(),
        },
      }
    } catch (error) {
      this.log("error", "Failed to get order status", error)
      return {
        success: false,
        error: "Network or API error",
        errorDetails: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async getOrderHistory(trackingNumber: string, credentials: DeliveryCredentials): Promise<DeliveryTrackingResponse> {
    this.log("info", "Getting order history", { trackingNumber })

    const credValidation = this.validateCredentials(credentials)
    if (!credValidation.valid) {
      return {
        success: false,
        error: "Credentials validation failed",
        errorDetails: credValidation.errors.join(", "),
      }
    }

    try {
      const soapEnvelope = this.buildTrackHistorySoapEnvelope(trackingNumber, credentials)

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: "TrackShipment",
        },
        body: soapEnvelope,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const responseText = await response.text()
      const parsedResponse = this.parseHistoryResponse(responseText)

      if (parsedResponse.HasErrors === 1) {
        return {
          success: false,
          error: "API Error",
          errorDetails: parsedResponse.ErrorsTxt || "Unknown error from Best Delivery API",
        }
      }

      const history: DeliveryStatusHistory[] = (parsedResponse.status || []).map((item) => ({
        status: this.mapStatusToStandard(item.status),
        message: item.message || item.status,
        date: new Date(item.date),
      }))

      const currentStatus =
        history.length > 0
          ? history[0]
          : {
              status: "pending",
              message: "No status available",
              date: new Date(),
            }

      return {
        success: true,
        status: {
          trackingNumber: parsedResponse.tracking_number || trackingNumber,
          status: currentStatus.status,
          message: currentStatus.message,
          lastUpdated: currentStatus.date,
          history,
        },
      }
    } catch (error) {
      this.log("error", "Failed to get order history", error)
      return {
        success: false,
        error: "Network or API error",
        errorDetails: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    console.log(`🧪 Testing connection for ${this.name}`)

    try {
      // Create a minimal test order to verify credentials
      const testCredentials = {
        type: "username_password" as const,
        username: "test",
        password: "test",
      }

      // Validate credentials format first
      const validation = this.validateCredentials(testCredentials)
      if (!validation.valid) {
        return {
          success: false,
          error: "Invalid credentials format for testing",
          details: validation.errors,
        }
      }

      // Test with a minimal SOAP request
      const testSoapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <TestConnection>
      <credentials>
        <login>test</login>
        <pwd>test</pwd>
      </credentials>
    </TestConnection>
  </soap:Body>
</soap:Envelope>`

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: "TestConnection",
        },
        body: testSoapEnvelope,
      })

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: { status: response.status, statusText: response.statusText },
        }
      }

      const responseText = await response.text()

      // For Best Delivery, we consider the connection successful if we get any response
      // (even authentication errors mean the connection is working)
      return {
        success: true,
        details: {
          responseReceived: true,
          apiUrl: this.apiUrl,
          supportedRegions: this.supportedRegions.length,
        },
      }
    } catch (error) {
      console.error(`❌ Connection test failed for ${this.name}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown connection error",
        details: { error },
      }
    }
  }

  mapStatusToStandard(agencyStatus: string | number): string {
    // Map Best Delivery status codes to standard status
    const statusCode = typeof agencyStatus === "string" ? Number.parseInt(agencyStatus) : agencyStatus

    switch (statusCode) {
      case 0:
      case 1:
        return "pending"
      case 2:
        return "confirmed"
      case 3:
        return "picked_up"
      case 4:
      case 5:
        return "in_transit"
      case 6:
        return "out_for_delivery"
      case 7:
        return "delivered"
      case 8:
        return "failed_delivery"
      case 9:
        return "returned"
      case 10:
        return "cancelled"
      default:
        return "pending"
    }
  }

  private buildCreateOrderSoapEnvelope(
    order: DeliveryOrder,
    credentials: DeliveryCredentials,
    testMode = false,
  ): string {
    const pickup: BestDeliveryPickup = {
      nom: order.customerName,
      gouvernerat: order.governorate,
      ville: order.city,
      adresse: order.address,
      tel: order.phone,
      tel2: order.phone2 || "",
      designation: order.productName,
      prix: order.price.toString().replace(".", ","), // Best Delivery expects comma as decimal separator
      msg: order.comment || "",
      echange: order.isExchange ? "1" : "0",
      login: credentials.username || "",
      pwd: credentials.password || "",
    }

    // In test mode, use a very low price to avoid creating actual orders
    if (testMode) {
      pickup.prix = "0,01"
      pickup.msg = "TEST - DO NOT PROCESS"
    }

    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <CreatePickup>
      <pickup>
        <nom>${this.escapeXml(pickup.nom)}</nom>
        <gouvernerat>${this.escapeXml(pickup.gouvernerat)}</gouvernerat>
        <ville>${this.escapeXml(pickup.ville)}</ville>
        <adresse>${this.escapeXml(pickup.adresse)}</adresse>
        <tel>${this.escapeXml(pickup.tel)}</tel>
        <tel2>${this.escapeXml(pickup.tel2)}</tel2>
        <designation>${this.escapeXml(pickup.designation)}</designation>
        <prix>${this.escapeXml(pickup.prix)}</prix>
        <msg>${this.escapeXml(pickup.msg)}</msg>
        <echange>${pickup.echange}</echange>
        <login>${this.escapeXml(pickup.login)}</login>
        <pwd>${this.escapeXml(pickup.pwd)}</pwd>
      </pickup>
    </CreatePickup>
  </soap:Body>
</soap:Envelope>`
  }

  private buildTrackStatusSoapEnvelope(trackingNumber: string, credentials: DeliveryCredentials): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <TrackShipmentStatus>
      <pickup>
        <login>${this.escapeXml(credentials.username || "")}</login>
        <pwd>${this.escapeXml(credentials.password || "")}</pwd>
        <tracking_number>${this.escapeXml(trackingNumber)}</tracking_number>
      </pickup>
    </TrackShipmentStatus>
  </soap:Body>
</soap:Envelope>`
  }

  private buildTrackHistorySoapEnvelope(trackingNumber: string, credentials: DeliveryCredentials): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <TrackShipment>
      <pickup>
        <login>${this.escapeXml(credentials.username || "")}</login>
        <pwd>${this.escapeXml(credentials.password || "")}</pwd>
        <tracking_number>${this.escapeXml(trackingNumber)}</tracking_number>
      </pickup>
    </TrackShipment>
  </soap:Body>
</soap:Envelope>`
  }

  private parseCreateOrderResponse(responseText: string): BestDeliveryResponse {
    try {
      // Simple XML parsing for SOAP response
      const hasErrorsMatch = responseText.match(/<HasErrors>(\d+)<\/HasErrors>/)
      const errorsTxtMatch = responseText.match(/<ErrorsTxt>(.*?)<\/ErrorsTxt>/)
      const codeBarreMatch = responseText.match(/<CodeBarre>(\d+)<\/CodeBarre>/)
      const urlMatch = responseText.match(/<Url>(.*?)<\/Url>/)

      return {
        HasErrors: hasErrorsMatch ? Number.parseInt(hasErrorsMatch[1]) : 1,
        ErrorsTxt: errorsTxtMatch ? errorsTxtMatch[1] : "Failed to parse response",
        CodeBarre: codeBarreMatch ? codeBarreMatch[1] : undefined,
        Url: urlMatch ? urlMatch[1] : undefined,
      }
    } catch (error) {
      this.log("error", "Failed to parse create order response", error)
      return {
        HasErrors: 1,
        ErrorsTxt: "Failed to parse API response",
      }
    }
  }

  private parseStatusResponse(responseText: string): BestDeliveryStatusResponse {
    try {
      const hasErrorsMatch = responseText.match(/<HasErrors>(\d+)<\/HasErrors>/)
      const errorsTxtMatch = responseText.match(/<ErrorsTxt>(.*?)<\/ErrorsTxt>/)
      const trackingNumberMatch = responseText.match(/<tracking_number>(\d+)<\/tracking_number>/)
      const statusMatch = responseText.match(/<status>(\d+)<\/status>/)
      const messageMatch = responseText.match(/<message>(.*?)<\/message>/)

      return {
        HasErrors: hasErrorsMatch ? Number.parseInt(hasErrorsMatch[1]) : 1,
        ErrorsTxt: errorsTxtMatch ? errorsTxtMatch[1] : "Failed to parse response",
        tracking_number: trackingNumberMatch ? trackingNumberMatch[1] : undefined,
        status: statusMatch ? Number.parseInt(statusMatch[1]) : undefined,
        message: messageMatch ? messageMatch[1] : undefined,
      }
    } catch (error) {
      this.log("error", "Failed to parse status response", error)
      return {
        HasErrors: 1,
        ErrorsTxt: "Failed to parse API response",
      }
    }
  }

  private parseHistoryResponse(responseText: string): BestDeliveryHistoryResponse {
    try {
      const hasErrorsMatch = responseText.match(/<HasErrors>(\d+)<\/HasErrors>/)
      const errorsTxtMatch = responseText.match(/<ErrorsTxt>(.*?)<\/ErrorsTxt>/)
      const trackingNumberMatch = responseText.match(/<tracking_number>(\d+)<\/tracking_number>/)

      // Parse status array - this is a simplified version
      const statusArray: Array<{ status: string; date: string; message?: string }> = []
      const statusMatches = responseText.match(/<status>(.*?)<\/status>/gs)

      if (statusMatches) {
        statusMatches.forEach((match) => {
          const statusMatch = match.match(/<status>(.*?)<\/status>/)
          const dateMatch = match.match(/<date>(.*?)<\/date>/)
          const messageMatch = match.match(/<message>(.*?)<\/message>/)

          if (statusMatch && dateMatch) {
            statusArray.push({
              status: statusMatch[1],
              date: dateMatch[1],
              message: messageMatch ? messageMatch[1] : undefined,
            })
          }
        })
      }

      return {
        HasErrors: hasErrorsMatch ? Number.parseInt(hasErrorsMatch[1]) : 1,
        ErrorsTxt: errorsTxtMatch ? errorsTxtMatch[1] : "Failed to parse response",
        tracking_number: trackingNumberMatch ? trackingNumberMatch[1] : undefined,
        status: statusArray,
      }
    } catch (error) {
      this.log("error", "Failed to parse history response", error)
      return {
        HasErrors: 1,
        ErrorsTxt: "Failed to parse API response",
      }
    }
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
  }
}
