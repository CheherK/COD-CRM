-- Create order activities table for tracking all order-related actions
CREATE TABLE order_activities (
    id VARCHAR(255) PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    details TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX idx_order_activities_order_id ON order_activities(order_id);
CREATE INDEX idx_order_activities_user_id ON order_activities(user_id);
CREATE INDEX idx_order_activities_action ON order_activities(action);
CREATE INDEX idx_order_activities_created_at ON order_activities(created_at);

-- Create order status change triggers
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Log status changes
    IF OLD.status != NEW.status THEN
        INSERT INTO order_activities (
            id, order_id, action, details, old_values, new_values, created_at
        ) VALUES (
            'act-' || extract(epoch from now()) || '-' || floor(random() * 1000),
            NEW.id,
            'STATUS_CHANGED',
            'Order status changed from ' || OLD.status || ' to ' || NEW.status,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status),
            now()
        );
    END IF;
    
    -- Log attempt count changes
    IF OLD.attempt_count != NEW.attempt_count THEN
        INSERT INTO order_activities (
            id, order_id, action, details, old_values, new_values, created_at
        ) VALUES (
            'act-' || extract(epoch from now()) || '-' || floor(random() * 1000),
            NEW.id,
            'ATTEMPT_COUNT_UPDATED',
            'Attempt count changed from ' || OLD.attempt_count || ' to ' || NEW.attempt_count,
            jsonb_build_object('attempt_count', OLD.attempt_count),
            jsonb_build_object('attempt_count', NEW.attempt_count),
            now()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order updates
CREATE TRIGGER order_status_change_trigger
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION log_order_status_change();

-- Create function to log order creation
CREATE OR REPLACE FUNCTION log_order_creation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO order_activities (
        id, order_id, action, details, new_values, created_at
    ) VALUES (
        'act-' || extract(epoch from now()) || '-' || floor(random() * 1000),
        NEW.id,
        'ORDER_CREATED',
        'New order created for customer: ' || NEW.customer_name,
        jsonb_build_object(
            'customer_name', NEW.customer_name,
            'status', NEW.status,
            'total', NEW.total
        ),
        now()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order creation
CREATE TRIGGER order_creation_trigger
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION log_order_creation();

-- Create function to log order deletion
CREATE OR REPLACE FUNCTION log_order_deletion()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO order_activities (
        id, order_id, action, details, old_values, created_at
    ) VALUES (
        'act-' || extract(epoch from now()) || '-' || floor(random() * 1000),
        OLD.id,
        'ORDER_DELETED',
        'Order deleted for customer: ' || OLD.customer_name,
        jsonb_build_object(
            'customer_name', OLD.customer_name,
            'status', OLD.status,
            'total', OLD.total
        ),
        now()
    );
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order deletion
CREATE TRIGGER order_deletion_trigger
    BEFORE DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION log_order_deletion();
