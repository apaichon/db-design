# VI. Database Optimization
<!-- TOC -->
- [VI. Database Optimization](#vi-database-optimization)
    - [1. Query Performance Statistics](#1-query-performance-statistics)
        - [1.1 Query Analysis (pg_stat_statements)](#11-query-analysis-pg_stat_statements)
        - [1.2 Database Activity (pg_stat_activity)](#12-database-activity-pg_stat_activity)
        - [1.3 Replication Status](#13-replication-status)
        - [1.4 Background Writer Stats](#14-background-writer-stats)
        - [1.5 Database Statistics](#15-database-statistics)
        - [1.6 Table Statistics](#16-table-statistics)
        - [1.7 Query History Analysis](#17-query-history-analysis)
    - [2. Database Caching](#2-database-caching)
        - [2.1 Caching Strategies](#21-caching-strategies)
        - [2.2 Implementation Example](#22-implementation-example)
        - [2.3 Query Cache with Redis](#23-query-cache-with-redis)
        - [2.4 Redis Cache Implementation](#24-redis-cache-implementation)
        - [2.5 Usage Example](#25-usage-example)
        - [2.6 Cache Invalidation Strategy](#26-cache-invalidation-strategy)
        - [2.7 Monitoring Cache Performance](#27-monitoring-cache-performance)
        - [2.8 Best Practices for Redis Caching](#28-best-practices-for-redis-caching)
    - [3. SQL Query Optimization](#3-sql-query-optimization)
        - [3.1 Query Analysis](#31-query-analysis)
        - [3.2 Index Optimization](#32-index-optimization)
    - [4. Schema Optimization](#4-schema-optimization)
        - [4.1 Table Partitioning](#41-table-partitioning)
        - [4.2 Table Sharding](#42-table-sharding)
    - [5. Database Replication](#5-database-replication)
        - [5.1 Master-Slave Configuration](#51-master-slave-configuration)
        - [5.2 Replication Monitoring](#52-replication-monitoring)
    - [6. Backup and Recovery](#6-backup-and-recovery)
        - [6.1 Backup Strategy](#61-backup-strategy)
        - [6.2 Point-in-Time Recovery](#62-point-in-time-recovery)
    - [7. Best Practices](#7-best-practices)
    - [8. Common Pitfalls](#8-common-pitfalls)
<!-- /TOC -->

## 1. Query Performance Statistics (pg_stat_statements)
```sql
SELECT 
    queryid,
    substring(query, 1, 50) as query_preview,
    calls,
    total_exec_time / 1000 as total_exec_seconds,
    mean_exec_time / 1000 as mean_exec_seconds,
    rows
FROM pg_stat_statements 
ORDER BY total_exec_time DESC 
LIMIT 5;

/*
 queryid | query_preview                                      | calls | total_exec_seconds | mean_exec_seconds | rows
---------+---------------------------------------------------+-------+-------------------+------------------+------
 123456  | SELECT * FROM orders WHERE customer_id = $1        | 15000 |            450.25 |             0.03 | 45000
 234567  | UPDATE users SET last_login = $1 WHERE user_id = $2|  8000 |            380.15 |             0.05 |  8000
 345678  | INSERT INTO audit_log (action, user_id, data)      | 25000 |            320.80 |             0.01 | 25000
*/

-- 2. Current Database Activity (pg_stat_activity)
SELECT 
    pid,
    usename,
    application_name,
    state,
    query_start,
    wait_event_type,
    state_change
FROM pg_stat_activity 
WHERE state != 'idle';

/*
 pid  | usename  | application_name | state    | query_start        | wait_event_type | state_change
------+----------+-----------------+----------+-------------------+-----------------+-------------
 1234 | app_user | MyApp          | active   | 2024-01-20 10:15 | Client         | 2024-01-20 10:15
 2345 | admin    | pgAdmin        | active   | 2024-01-20 10:14 | IO             | 2024-01-20 10:14
*/

-- 3. Replication Status (pg_stat_replication)
SELECT 
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    write_lag,
    flush_lag,
    replay_lag
FROM pg_stat_replication;

/*
 client_addr   | state     | sent_lsn  | write_lsn | flush_lsn | replay_lsn | write_lag | flush_lag | replay_lag
--------------+-----------+-----------+-----------+-----------+------------+-----------+-----------+------------
 192.168.1.10 | streaming | 0/15E7340 | 0/15E7340 | 0/15E7340 | 0/15E7340 | 00:00:00  | 00:00:00  | 00:00:00
*/

-- 4. Background Writer Statistics (pg_stat_bgwriter)
SELECT 
    checkpoints_timed,
    checkpoints_req,
    buffers_checkpoint,
    buffers_clean,
    maxwritten_clean,
    buffers_backend
FROM pg_stat_bgwriter;

/*
 checkpoints_timed | checkpoints_req | buffers_checkpoint | buffers_clean | maxwritten_clean | buffers_backend
------------------+-----------------+-------------------+---------------+-----------------+-----------------
             1250 |              45 |           524288 |        98304 |            1000 |          65536
*/

-- 5. Database Statistics (pg_stat_database)
SELECT 
    datname,
    numbackends,
    xact_commit,
    xact_rollback,
    blks_read,
    blks_hit,
    tup_returned,
    tup_fetched,
    tup_inserted,
    tup_updated,
    tup_deleted
FROM pg_stat_database 
WHERE datname = current_database();

/*
 datname | numbackends | xact_commit | xact_rollback | blks_read | blks_hit | tup_returned | tup_fetched | tup_inserted | tup_updated | tup_deleted
---------+-------------+-------------+---------------+-----------+----------+--------------+-------------+--------------+-------------+-------------
 mydb    |          25 |     1000000 |          500 |    50000 |  2000000 |     5000000 |     1000000 |       50000 |       25000 |       10000
*/

-- 6. Table Statistics (pg_stat_user_tables)
SELECT 
    schemaname,
    relname,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    n_live_tup,
    n_dead_tup,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables 
ORDER BY n_live_tup DESC 
LIMIT 5;

/*
 schemaname | relname | seq_scan | seq_tup_read | idx_scan | idx_tup_fetch | n_tup_ins | n_tup_upd | n_tup_del | n_live_tup | n_dead_tup | last_vacuum        | last_autovacuum
-----------+---------+----------+--------------+----------+---------------+-----------+-----------+-----------+------------+------------+------------------+-------------------
 public    | orders  |      100 |      1000000 |   500000 |       500000 |    100000 |     50000 |     10000 |     500000 |      25000 | 2024-01-20 09:00 | 2024-01-20 08:00
 public    | users   |       50 |       100000 |   200000 |       200000 |     20000 |     10000 |      1000 |     100000 |       5000 | 2024-01-20 09:15 | 2024-01-20 08:15
*/

## 1.7 Query History Analysis

-- 1. Enable query logging in postgresql.conf
```bash
# postgresql.conf
log_statement = 'all'           # Log all statements
log_min_duration_statement = 0  # Log all statements regardless of duration
logging_collector = on          # Enable logging collector
log_directory = 'pg_log'        # Directory where log files are written
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'  # Log file name pattern
```

-- 2. View recent queries from pg_stat_statements
```sql
-- Requires pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View most time-consuming queries
SELECT 
    substring(query, 1, 100) as short_query,
    calls,
    total_exec_time/1000 as total_exec_ms,
    mean_exec_time/1000 as avg_exec_ms,
    rows,
    100.0 * shared_blks_hit/nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- View queries by specific user
SELECT 
    substring(query, 1, 100) as short_query,
    calls,
    rows,
    total_exec_time/1000 as total_exec_ms
FROM pg_stat_statements
WHERE userid = (SELECT usesysid FROM pg_user WHERE usename = 'your_username')
ORDER BY calls DESC
LIMIT 10;

-- Reset statistics
SELECT pg_stat_statements_reset();
```

-- 3. View current activity
```sql
-- Show currently executing queries
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    query_start,
    state,
    substring(query, 1, 100) as current_query
FROM pg_stat_activity
WHERE state != 'idle'
AND query NOT LIKE '%pg_stat_activity%'
ORDER BY query_start DESC;

-- Show long-running queries (over 1 minute)
SELECT 
    pid,
    usename,
    query_start,
    state,
    substring(query, 1, 100) as query_preview,
    age(clock_timestamp(), query_start) as query_duration
FROM pg_stat_activity
WHERE state != 'idle'
AND age(clock_timestamp(), query_start) > interval '1 minute'
ORDER BY query_start;
```

-- 4. Query log analysis
```sql
-- Create function to parse log files (requires superuser)
CREATE OR REPLACE FUNCTION read_log_file(log_file text)
RETURNS TABLE (
    log_time timestamp,
    user_name text,
    database text,
    query text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (regexp_matches(line, '\[(.*?)\]'))[1]::timestamp,
        (regexp_matches(line, 'user=(.*?),'))[1],
        (regexp_matches(line, 'db=(.*?),'))[1],
        (regexp_matches(line, 'execute <.*?>: (.*)'))[1]
    FROM pg_read_file(log_file) AS f(line)
    WHERE line LIKE '%execute%';
END;
$$ LANGUAGE plpgsql;

-- Usage example
SELECT * FROM read_log_file('pg_log/postgresql-2024-01-20_000000.log')
WHERE user_name = 'your_username'
ORDER BY log_time DESC
LIMIT 10;
```

-- 5. Analyze slow queries
```sql
-- Create table for storing slow query logs
CREATE TABLE slow_query_log (
    id SERIAL PRIMARY KEY,
    query_text text,
    duration interval,
    start_time timestamp,
    user_name text,
    database_name text,
    client_addr inet
);

-- Create function to capture slow queries
CREATE OR REPLACE FUNCTION log_slow_query()
RETURNS trigger AS $$
BEGIN
    IF NEW.state = 'active' AND 
       NEW.query_start < now() - interval '5 seconds' THEN
        INSERT INTO slow_query_log (
            query_text,
            duration,
            start_time,
            user_name,
            database_name,
            client_addr
        ) VALUES (
            NEW.query,
            age(clock_timestamp(), NEW.query_start),
            NEW.query_start,
            NEW.usename,
            NEW.datname,
            NEW.client_addr
        );
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER capture_slow_queries
AFTER INSERT OR UPDATE ON pg_stat_activity
FOR EACH ROW
EXECUTE FUNCTION log_slow_query();

-- Query slow query history
SELECT 
    to_char(start_time, 'YYYY-MM-DD HH24:MI:SS') as started_at,
    duration,
    user_name,
    substring(query_text, 1, 100) as query_preview
FROM slow_query_log
WHERE duration > interval '1 second'
ORDER BY duration DESC
LIMIT 10;
```

Best Practices:
1. Regularly analyze query patterns
2. Monitor long-running queries
3. Set appropriate logging levels
4. Rotate log files
5. Clean up old statistics
6. Monitor disk space for logs

## 2. Database Caching
### 2.1 Caching Strategies
```mermaid
graph TD
    A[Caching Strategies] --> B[Query Cache]
    A --> C[Result Cache]
    A --> D[Object Cache]
    B --> E[Full Query]
    C --> F[Partial Results]
    D --> G[Application Objects]
```

### 2.2 Implementation Example
```sql
-- Query result cache table
CREATE TABLE query_cache (
    cache_key VARCHAR(64) PRIMARY KEY,
    query_text TEXT,
    result_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    hit_count INTEGER DEFAULT 0
);

-- Cache function
CREATE OR REPLACE FUNCTION get_cached_result(
    p_query TEXT,
    p_ttl INTERVAL DEFAULT INTERVAL '1 hour'
)
RETURNS JSONB AS $$
DECLARE
    v_cache_key VARCHAR(64);
    v_result JSONB;
BEGIN
    -- Generate cache key
    v_cache_key := MD5(p_query);
    
    -- Try to get from cache
    SELECT result_data INTO v_result
    FROM query_cache
    WHERE cache_key = v_cache_key
    AND expires_at > NOW();
    
    IF FOUND THEN
        -- Update hit count
        UPDATE query_cache 
        SET hit_count = hit_count + 1
        WHERE cache_key = v_cache_key;
        RETURN v_result;
    END IF;
    
    -- Execute query and cache result
    EXECUTE p_query INTO v_result;
    
    -- Store in cache
    INSERT INTO query_cache (
        cache_key, 
        query_text, 
        result_data, 
        expires_at
    ) VALUES (
        v_cache_key,
        p_query,
        v_result,
        NOW() + p_ttl
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
```

### 2.3 Query Cache with Redis  

```mermaid
graph TD
    A[Application] --> B[Redis Cache]
    A --> C[Database]
    B --> D[Cache Hit]
    B --> E[Cache Miss]
    E --> C
```

Figure 2.3: Redis Caching Flow

### Redis Cache Implementation
```go
package cache

import (
    "context"
    "encoding/json"
    "time"
    "github.com/go-redis/redis/v8"
)

type QueryCache struct {
    client *redis.Client
    ttl    time.Duration
}

// Cache result structure
type QueryResult struct {
    Data      interface{} `json:"data"`
    CreatedAt time.Time   `json:"created_at"`
    HitCount  int         `json:"hit_count"`
}

// New cache instance
func NewQueryCache(addr string, ttl time.Duration) *QueryCache {
    client := redis.NewClient(&redis.Options{
        Addr:     addr,
        Password: "", // set if required
        DB:       0,
    })
    
    return &QueryCache{
        client: client,
        ttl:    ttl,
    }
}

// Get cached result
func (c *QueryCache) Get(ctx context.Context, key string) (*QueryResult, error) {
    data, err := c.client.Get(ctx, key).Bytes()
    if err == redis.Nil {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }
    
    var result QueryResult
    if err := json.Unmarshal(data, &result); err != nil {
        return nil, err
    }
    
    // Update hit count
    result.HitCount++
    c.updateHitCount(ctx, key, result)
    
    return &result, nil
}

// Set cache with result
func (c *QueryCache) Set(ctx context.Context, key string, data interface{}) error {
    result := QueryResult{
        Data:      data,
        CreatedAt: time.Now(),
        HitCount:  0,
    }
    
    bytes, err := json.Marshal(result)
    if err != nil {
        return err
    }
    
    return c.client.Set(ctx, key, bytes, c.ttl).Err()
}

// Update hit count
func (c *QueryCache) updateHitCount(ctx context.Context, key string, result QueryResult) {
    bytes, _ := json.Marshal(result)
    c.client.Set(ctx, key, bytes, c.ttl)
}
```

### Usage Example
```go
package main

import (
    "context"
    "database/sql"
    "encoding/json"
    "fmt"
    "time"
    _ "github.com/lib/pq"
)

type OrderSummary struct {
    CustomerID   int     `json:"customer_id"`
    OrderCount   int     `json:"order_count"`
    TotalAmount float64 `json:"total_amount"`
}

func GetOrderSummary(ctx context.Context, db *sql.DB, cache *QueryCache, customerID int) (*OrderSummary, error) {
    cacheKey := fmt.Sprintf("order_summary:%d", customerID)
    
    // Try cache first
    if cached, err := cache.Get(ctx, cacheKey); err == nil && cached != nil {
        var summary OrderSummary
        data, _ := json.Marshal(cached.Data)
        json.Unmarshal(data, &summary)
        return &summary, nil
    }
    
    // Cache miss - query database
    query := `
        SELECT 
            customer_id,
            COUNT(*) as order_count,
            COALESCE(SUM(total_amount), 0) as total_amount
        FROM orders
        WHERE customer_id = $1
        GROUP BY customer_id
    `
    
    var summary OrderSummary
    err := db.QueryRowContext(ctx, query, customerID).Scan(
        &summary.CustomerID,
        &summary.OrderCount,
        &summary.TotalAmount,
    )
    if err != nil {
        return nil, err
    }
    
    // Store in cache
    cache.Set(ctx, cacheKey, summary)
    
    return &summary, nil
}

func main() {
    // Initialize cache
    cache := NewQueryCache("localhost:6379", 1*time.Hour)
    
    // Initialize database
    db, err := sql.Open("postgres", "postgres://user:pass@localhost/dbname?sslmode=disable")
    if err != nil {
        panic(err)
    }
    defer db.Close()
    
    // Example usage
    ctx := context.Background()
    summary, err := GetOrderSummary(ctx, db, cache, 123)
    if err != nil {
        panic(err)
    }
    
    fmt.Printf("Order Summary: %+v\n", summary)
}
```

### Cache Invalidation Strategy
```go
// Cache invalidation function
func (c *QueryCache) Invalidate(ctx context.Context, patterns ...string) error {
    pipe := c.client.Pipeline()
    
    for _, pattern := range patterns {
        iter := c.client.Scan(ctx, 0, pattern, 0).Iterator()
        for iter.Next(ctx) {
            pipe.Del(ctx, iter.Val())
        }
    }
    
    _, err := pipe.Exec(ctx)
    return err
}

// Example usage for cache invalidation
func InvalidateCustomerCache(ctx context.Context, cache *QueryCache, customerID int) error {
    patterns := []string{
        fmt.Sprintf("order_summary:%d", customerID),
        fmt.Sprintf("customer_profile:%d", customerID),
    }
    return cache.Invalidate(ctx, patterns...)
}

// Trigger invalidation after order updates
func UpdateOrder(ctx context.Context, db *sql.DB, cache *QueryCache, orderID, customerID int) error {
    // Start transaction
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    
    // Update order
    // ... order update logic ...
    
    // Invalidate cache
    if err := InvalidateCustomerCache(ctx, cache, customerID); err != nil {
        tx.Rollback()
        return err
    }
    
    return tx.Commit()
}
```

### Monitoring Cache Performance
```go
type CacheStats struct {
    Hits        int64     `json:"hits"`
    Misses      int64     `json:"misses"`
    KeysCount   int64     `json:"keys_count"`
    MemoryUsage int64     `json:"memory_usage"`
    UpdatedAt   time.Time `json:"updated_at"`
}

func (c *QueryCache) GetStats(ctx context.Context) (*CacheStats, error) {
    stats := &CacheStats{
        UpdatedAt: time.Now(),
    }
    
    // Get cache statistics
    info, err := c.client.Info(ctx, "stats").Result()
    if err != nil {
        return nil, err
    }
    
    // Parse Redis INFO output
    // ... parsing logic ...
    
    return stats, nil
}
```

Best Practices for Redis Caching:
1. **Cache Keys**
   - Use consistent naming conventions
   - Include version in keys
   - Consider key expiration

2. **Data Structure**
   - Use appropriate Redis data types
   - Compress large values
   - Monitor memory usage

3. **Error Handling**
   - Graceful degradation
   - Circuit breaker pattern
   - Retry mechanisms

4. **Performance**
   - Monitor hit/miss ratios
   - Set appropriate TTLs
   - Regular cache cleanup

5. **Consistency**
   - Implement proper invalidation
   - Handle race conditions
   - Version cache entries

## 3. SQL Query Optimization
### 3.1 Query Analysis
```sql
-- Example of a poorly optimized query
EXPLAIN ANALYZE
SELECT c.customer_name, 
       COUNT(o.order_id) as order_count,
       SUM(oi.quantity * oi.unit_price) as total_amount
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
LEFT JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY c.customer_name;

-- Optimized version
WITH customer_orders AS (
    SELECT customer_id, 
           COUNT(order_id) as order_count,
           SUM(total_amount) as total_amount
    FROM orders
    GROUP BY customer_id
)
SELECT c.customer_name,
       COALESCE(co.order_count, 0) as order_count,
       COALESCE(co.total_amount, 0) as total_amount
FROM customers c
LEFT JOIN customer_orders co ON c.customer_id = co.customer_id;
```

### 3.2 Index Optimization
```sql
-- Create indexes for common queries
CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date);
CREATE INDEX idx_order_items_order ON order_items(order_id, product_id);

-- Partial index for active records
CREATE INDEX idx_customers_active ON customers(customer_id) 
WHERE status = 'active';

-- Include columns to avoid table lookups
CREATE INDEX idx_orders_customer_include ON orders(customer_id) 
INCLUDE (order_date, status);
```

## 4. Schema Optimization
### 4.1 Table Partitioning
```sql
-- Create partitioned table
CREATE TABLE orders (
    order_id SERIAL,
    order_date DATE,
    customer_id INTEGER,
    total_amount DECIMAL(10,2)
) PARTITION BY RANGE (order_date);

-- Create partitions
CREATE TABLE orders_2023 PARTITION OF orders
    FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');
    
CREATE TABLE orders_2024 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### 4.2 Table Sharding
```sql
-- Sharding function
CREATE OR REPLACE FUNCTION get_shard_id(
    customer_id INTEGER,
    shard_count INTEGER
)
RETURNS INTEGER AS $$
BEGIN
    RETURN customer_id % shard_count;
END;
$$ LANGUAGE plpgsql;

-- Create sharded tables
CREATE TABLE orders_shard_0 (
    CHECK ( get_shard_id(customer_id, 4) = 0 )
) INHERITS (orders);

CREATE TABLE orders_shard_1 (
    CHECK ( get_shard_id(customer_id, 4) = 1 )
) INHERITS (orders);
```

## 5. Database Replication
### 5.1 Master-Slave Configuration
```bash
# postgresql.conf (Master)
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10

# postgresql.conf (Slave)
hot_standby = on
hot_standby_feedback = on
```

### 5.2 Replication Monitoring
```sql
-- Check replication status
SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn
FROM pg_stat_replication;

-- Monitor replication lag
SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;
```

## 6. Backup and Recovery
### 6.1 Backup Strategy
```bash
# Physical backup
pg_basebackup -D /backup/base -Fp -Xs -P -R

# Logical backup
pg_dump dbname > backup.sql

# Continuous archiving
archive_command = 'cp %p /archive/%f'
```

### 6.2 Point-in-Time Recovery
```sql
-- Recovery configuration
CREATE TABLE recovery_points (
    point_id SERIAL PRIMARY KEY,
    description TEXT,
    backup_start TIMESTAMP,
    backup_end TIMESTAMP,
    backup_label TEXT,
    wal_file TEXT
);

-- Record recovery point
INSERT INTO recovery_points (
    description,
    backup_start,
    backup_end,
    backup_label,
    wal_file
) VALUES (
    'Pre-migration backup',
    NOW(),
    NULL,
    'backup_2024_01_01',
    '000000010000000000000001'
);
```

## Best Practices
1. Regular performance monitoring
2. Proper indexing strategy
3. Query optimization
4. Regular maintenance
5. Backup verification
6. High availability setup
7. Security considerations

## Common Pitfalls
1. Over-indexing
2. Poor query design
3. Insufficient monitoring
4. Inadequate backup strategy
5. Missing maintenance
6. Security vulnerabilities
