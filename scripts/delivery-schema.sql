-- Delivery Agencies Configuration
CREATE TABLE IF NOT EXISTS delivery_agencies (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    credentials_type VARCHAR(20) NOT NULL, -- 'username_password', 'email_password', 'api_key'
    credentials_username VARCHAR(100),
    credentials_email VARCHAR(100),
    credentials_password VARCHAR(255),
    credentials_api_key VARCHAR(255),
    settings JSON,
    webhook_url VARCHAR(500),
    polling_interval INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Delivery Shipments
CREATE TABLE IF NOT EXISTS delivery_shipments (
    id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL,
    agency_id VARCHAR(50) NOT NULL,
    tracking_number VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    last_status_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    print_url VARCHAR(500),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (agency_id) REFERENCES delivery_agencies(id),
    INDEX idx_order_id (order_id),
    INDEX idx_tracking_number (tracking_number),
    INDEX idx_status (status)
);

-- Delivery Status Logs
CREATE TABLE IF NOT EXISTS delivery_status_logs (
    id VARCHAR(50) PRIMARY KEY,
    shipment_id VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    status_code INTEGER,
    message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source ENUM('api', 'webhook', 'manual') DEFAULT 'api',
    raw_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shipment_id) REFERENCES delivery_shipments(id),
    INDEX idx_shipment_id (shipment_id),
    INDEX idx_timestamp (timestamp)
);

-- Insert default Best Delivery agency
INSERT INTO delivery_agencies (id, name, enabled, credentials_type, settings) 
VALUES (
    'best-delivery', 
    'Best Delivery', 
    FALSE, 
    'username_password',
    JSON_OBJECT(
        'autoSync', true,
        'pollingInterval', 30,
        'supportedRegions', JSON_ARRAY(
            'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa',
            'Jendouba', 'Kairouan', 'Kasserine', 'Kébili', 'La Manouba',
            'Le Kef', 'Mahdia', 'Médenine', 'Monastir', 'Nabeul', 'Sfax',
            'Sidi Bouzid', 'Siliana', 'Sousse', 'Tataouine', 'Tozeur',
            'Tunis', 'Zaghouan'
        )
    )
) ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
