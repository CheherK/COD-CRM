// lib/delivery/agencies/best-delivery.ts

import { cpSync } from 'fs';
import { BaseDeliveryAgency } from '../base-agency';
import type {
  DeliveryCredentials,
  DeliveryOrder,
  DeliveryOrderResponse,
  DeliveryTrackingResponse,
  DeliveryStatus,
  DeliveryStatusEnum,
} from '../types';
import { DELIVERY_STATUSES } from '../types';

interface BestDeliveryResponse {
  HasErrors: number;
  ErrorsTxt: string;
  CodeBarre?: string;
  Url?: string;
}

interface BestDeliveryStatusResponse {
  HasErrors: number;
  ErrorsTxt: string;
  tracking_number?: string;
  status?: number;
  message?: string;
}

export class BestDeliveryAgency extends BaseDeliveryAgency {
  readonly id = 'best-delivery';
  readonly name = 'Best Delivery';
  readonly credentialsType = 'username_password' as const;
  readonly supportedRegions = [
    'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa',
    'Jendouba', 'Kairouan', 'Kasserine', 'Kébili', 'La Manouba',
    'Le Kef', 'Mahdia', 'Médenine', 'Monastir', 'Nabeul', 'Sfax',
    'Sidi Bouzid', 'Siliana', 'Sousse', 'Tataouine', 'Tozeur',
    'Tunis', 'Zaghouan'
  ];

  private readonly apiUrl = 'https://api.best-delivery.net/serviceShipments.php';

  // Best Delivery specific status mapping
  protected getStatusMappingTable(): Record<number, DeliveryStatusEnum> {
    return {
      0: DELIVERY_STATUSES.UPLOADED,     // Pending/Created
      1: DELIVERY_STATUSES.UPLOADED,     // Confirmed  
      2: DELIVERY_STATUSES.UPLOADED,     // Ready for pickup
      3: DELIVERY_STATUSES.DEPOSIT,      // Picked up by agency
      4: DELIVERY_STATUSES.IN_TRANSIT,   // In transit to destination
      5: DELIVERY_STATUSES.IN_TRANSIT,   // Arrived at destination hub
      6: DELIVERY_STATUSES.IN_TRANSIT,   // Out for delivery
      7: DELIVERY_STATUSES.DELIVERED,    // Successfully delivered
      8: DELIVERY_STATUSES.RETURNED,     // Delivery failed
      9: DELIVERY_STATUSES.RETURNED,     // Returned to sender
      10: DELIVERY_STATUSES.RETURNED,    // Cancelled
    };
  }

  protected mapAgencyStatusToDeliveryStatus(agencyStatus: string | number): DeliveryStatusEnum {
    const statusCode = typeof agencyStatus === 'string' ? parseInt(agencyStatus) : agencyStatus;
    const mappingTable = this.getStatusMappingTable();

    return mappingTable[statusCode] || DELIVERY_STATUSES.UPLOADED;
  }

  async createOrder(order: DeliveryOrder, credentials: DeliveryCredentials): Promise<DeliveryOrderResponse> {
    this.log('info', 'Creating order', { customer: order.customerName, price: order.price });

    try {
      // Validate inputs
      const credValidation = this.validateCredentials(credentials);
      if (!credValidation.valid) {
        return { success: false, error: credValidation.errors.join(', ') };
      }

      const orderValidation = this.validateOrder(order);
      if (!orderValidation.valid) {
        return { success: false, error: orderValidation.errors.join(', ') };
      }

      // Format price with comma decimal separator as required by Best Delivery
      const formattedPrice = order.price.toString().replace('.', ',');

      // Create SOAP envelope matching the working Google Apps Script structure
      const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
  <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
                xmlns:ser="serviceShipments">
    <soap:Body>
      <ser:pickup>
        <ser:login>${this.escapeXml(credentials.username || '')}</ser:login>
        <ser:pwd>${this.escapeXml(credentials.password || '')}</ser:pwd>
        <ser:nom>${this.escapeXml(order.customerName)}</ser:nom>
        <ser:gouvernerat>${this.escapeXml(order.customerCity)}</ser:gouvernerat>
        <ser:ville>${this.escapeXml(order.customerCity)}</ser:ville>
        <ser:adresse>${this.escapeXml(order.customerAddress)}</ser:adresse>
        <ser:tel>${this.escapeXml(order.customerPhone)}</ser:tel>
        <ser:tel2>${this.escapeXml(order.customerPhone2 || '')}</ser:tel2>
        <ser:designation>${this.escapeXml(order.productName)}</ser:designation>
        <ser:prix>${this.escapeXml(formattedPrice)}</ser:prix>
        <ser:msg>${this.escapeXml(order.notes || '')}</ser:msg>
        <ser:echange>${order.notes?.toLowerCase().includes('exchange') ? '1' : '0'}</ser:echange>
      </ser:pickup>
    </soap:Body>
  </soap:Envelope>`;

      const response = await this.makeRequest(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': '"serviceShipments#CreatePickupServeur"',
        },
        body: soapRequest,
      });

      const responseText = await response.text();
      this.log('info', 'Raw API response', { response: responseText });

      const result = this.parseCreateOrderResponse(responseText);

      if (result.HasErrors === 1) {
        this.log('error', 'API returned error', { error: result.ErrorsTxt });
        return {
          success: false,
          error: result.ErrorsTxt || 'Unknown API error',
        };
      }

      if (!result.CodeBarre) {
        return {
          success: false,
          error: 'No tracking number returned from API',
        };
      }

      this.log('info', 'Order created successfully', {
        trackingNumber: result.CodeBarre,
        printUrl: result.Url,
      });

      return {
        success: true,
        trackingNumber: result.CodeBarre,
        barcode: result.CodeBarre,
        printUrl: result.Url,
      };
    } catch (error) {
      this.log('error', 'Order creation failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async trackOrder(trackingNumber: string, credentials: DeliveryCredentials): Promise<DeliveryTrackingResponse> {
    this.log('info', 'Tracking order', { trackingNumber });

    try {
      const credValidation = this.validateCredentials(credentials);
      if (!credValidation.valid) {
        return { success: false, error: credValidation.errors.join(', ') };
      }

      // Use the same SOAP structure as the working Google Apps Script
      const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
  <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
                xmlns:ser="serviceShipments">
    <soap:Body>
      <ser:pickup>
        <ser:login>${this.escapeXml(credentials.username || '')}</ser:login>
        <ser:pwd>${this.escapeXml(credentials.password || '')}</ser:pwd>
        <ser:tracking_number>${this.escapeXml(trackingNumber)}</ser:tracking_number>
      </ser:pickup>
    </soap:Body>
  </soap:Envelope>`;

      const response = await this.makeRequest(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': '"serviceShipments#TrackShipmentStatusServeur"',
        },
        body: soapRequest,
      });

      const responseText = await response.text();
      this.log('info', 'Raw tracking response', { response: responseText });

      const result = this.parseStatusResponse(responseText);

      if (result.HasErrors === 1) {
        this.log('error', 'Tracking API returned error', { error: result.ErrorsTxt });
        return {
          success: false,
          error: result.ErrorsTxt || 'Unknown tracking error',
        };
      }

      const deliveryStatus = this.mapAgencyStatusToDeliveryStatus(result.status || 0);

      const status: DeliveryStatus = {
        trackingNumber: result.tracking_number || trackingNumber,
        status: deliveryStatus,
        message: result.message || `Status: ${deliveryStatus}`,
        lastUpdated: new Date(),
      };

      return {
        success: true,
        status,
      };
    } catch (error) {
      this.log('error', 'Tracking failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async testConnection(credentials: DeliveryCredentials): Promise<{ success: boolean; error?: string; }> {
    this.log('info', 'Testing connection');

    try {
      const credValidation = this.validateCredentials(credentials);
      if (!credValidation.valid) {
        return { success: false, error: credValidation.errors.join(', ') };
      }

      // Create a minimal test order with all required fields to test credentials
      const testSoapRequest = `<?xml version="1.0" encoding="UTF-8"?>
  <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
                xmlns:ser="serviceShipments">
    <soap:Body>
      <ser:pickup>
        <ser:login>${this.escapeXml(credentials.username || '')}</ser:login>
        <ser:pwd>${this.escapeXml(credentials.password || '')}</ser:pwd>
        <ser:nom>Test Connection</ser:nom>
        <ser:gouvernerat>Sfax</ser:gouvernerat>
        <ser:ville>Sfax</ser:ville>
        <ser:adresse>Test Address</ser:adresse>
        <ser:tel>12345678</ser:tel>
        <ser:tel2></ser:tel2>
        <ser:designation>Test Product</ser:designation>
        <ser:prix>1,000</ser:prix>
        <ser:msg>Connection test - do not process</ser:msg>
        <ser:echange>0</ser:echange>
      </ser:pickup>
    </soap:Body>
  </soap:Envelope>`;

      const response = await this.makeRequest(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': '"serviceShipments#CreatePickupServeur"',
        },
        body: testSoapRequest,
      });

      const responseText = await response.text();

      console.log("🧪 Test connection response from Best delivery agency:", responseText);

      // Parse the response to check for authentication errors
      const hasErrorsMatch = responseText.match(/<HasErrors>(\d+)<\/HasErrors>/);
      const errorsTxtMatch = responseText.match(/<ErrorsTxt>([\s\S]*?)<\/ErrorsTxt>/);
      
      if (hasErrorsMatch) {
        const hasErrors = parseInt(hasErrorsMatch[1]);
        const errorsText = errorsTxtMatch ? errorsTxtMatch[1] : '';
        
        // Check for authentication-related errors
        if (errorsText.includes('Authentication failed') ||
            errorsText.includes('Invalid credentials') ||
            errorsText.includes('Login failed') ||
            errorsText.includes('Invalid login') ||
            errorsText.includes('Wrong password')) {
          return { success: false, error: 'Invalid credentials' };
        }
        
        // If we get validation errors (like missing fields), but not auth errors,
        // it means the credentials are valid
        if (hasErrors === 1 && errorsText.includes('field is mandatory')) {
          this.log('info', 'Connection test successful - credentials valid');
          return { success: true };
        }
        
        // If no errors, credentials are definitely valid
        if (hasErrors === 0) {
          this.log('info', 'Connection test successful - order would be created');
          return { success: true };
        }
      }

      // If we get any valid SOAP response, assume credentials are valid
      if (responseText.includes('<SOAP-ENV:') || responseText.includes('<soap:') || responseText.includes('HasErrors')) {
        this.log('info', 'Connection test successful');
        return { success: true };
      }

      return { success: false, error: 'Invalid response from API' };
    } catch (error) {
      this.log('error', 'Connection test failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  private parseCreateOrderResponse(responseText: string): BestDeliveryResponse {
    try {
      // Parse XML response - looking for the standard Best Delivery response format
      const hasErrorsMatch = responseText.match(/<HasErrors>(\d+)<\/HasErrors>/);
      const errorsTxtMatch = responseText.match(/<ErrorsTxt>(.*?)<\/ErrorsTxt>/);
      const codeBarreMatch = responseText.match(/<CodeBarre>(\d+)<\/CodeBarre>/);
      const urlMatch = responseText.match(/<Url>(.*?)<\/Url>/);

      return {
        HasErrors: hasErrorsMatch ? parseInt(hasErrorsMatch[1]) : 1,
        ErrorsTxt: errorsTxtMatch ? this.decodeXmlEntities(errorsTxtMatch[1]) : 'Failed to parse response',
        CodeBarre: codeBarreMatch ? codeBarreMatch[1] : undefined,
        Url: urlMatch ? this.decodeXmlEntities(urlMatch[1]) : undefined,
      };
    } catch (error) {
      this.log('error', 'Failed to parse create order response', error);
      return {
        HasErrors: 1,
        ErrorsTxt: 'Failed to parse API response',
      };
    }
  }

  private parseStatusResponse(responseText: string): BestDeliveryStatusResponse {
    try {
      const hasErrorsMatch = responseText.match(/<HasErrors>(\d+)<\/HasErrors>/);
      const errorsTxtMatch = responseText.match(/<ErrorsTxt>(.*?)<\/ErrorsTxt>/);
      const trackingNumberMatch = responseText.match(/<tracking_number>(\d+)<\/tracking_number>/);
      const statusMatch = responseText.match(/<status>(\d+)<\/status>/);
      const messageMatch = responseText.match(/<message>(.*?)<\/message>/);

      return {
        HasErrors: hasErrorsMatch ? parseInt(hasErrorsMatch[1]) : 1,
        ErrorsTxt: errorsTxtMatch ? this.decodeXmlEntities(errorsTxtMatch[1]) : 'Failed to parse response',
        tracking_number: trackingNumberMatch ? trackingNumberMatch[1] : undefined,
        status: statusMatch ? parseInt(statusMatch[1]) : undefined,
        message: messageMatch ? this.decodeXmlEntities(messageMatch[1]) : undefined,
      };
    } catch (error) {
      this.log('error', 'Failed to parse status response', error);
      return {
        HasErrors: 1,
        ErrorsTxt: 'Failed to parse API response',
      };
    }
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private decodeXmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }
}