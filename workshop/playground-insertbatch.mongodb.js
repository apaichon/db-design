/* global use, db */
// MongoDB Playground
// To disable this template go to Settings | MongoDB | Use Default Template For Playground.
// Make sure you are connected to enable completions and to be able to run a playground.
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.
// The result of the last command run in a playground is shown on the results panel.
// By default the first 20 documents will be returned with a cursor.
// Use 'console.log()' to print to the debug output.
// For more documentation on playgrounds please refer to
// https://www.mongodb.com/docs/mongodb-vscode/playgrounds/

// Select the database to use.
use('labs');

async function insertData(totalRecords) {
  const startTime = Date.now();
  const startDate = new Date('2023-01-01');
  const endDate = new Date('2023-12-31');
  
  let inserted = 0;
  let batch = [];
  
  console.log(`Starting insertion of ${totalRecords} records...`);
  
  while (inserted < totalRecords) {
      // Generate a random date between start and end
      const saleDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
      
      // Generate a random price between 1 and 100
      const price = Math.floor(Math.random() * 100) + 1;
      
      // Generate a random quantity between 1 and 10
      const quantity = Math.floor(Math.random() * 10) + 1;
      
      const data = {
          saleDate: saleDate,
          price: price,
          quantity: quantity,
          totalAmount: price * quantity
      };
      
      batch.push(data);
      
      // Insert batch when it reaches 1000 records
      if (batch.length === 1000) {
          try {
              await db.sales.insertMany(batch);
              inserted += batch.length;
              
              // Progress logging
              const progress = (inserted / totalRecords * 100).toFixed(2);
              const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
              const rate = (inserted / elapsedSeconds).toFixed(1);
              
              console.log(`Progress: ${progress}% (${inserted.toLocaleString()} records)`);
              console.log(`Rate: ${rate} records/second`);
              
              batch = [];
          } catch (error) {
              console.error('Error inserting batch:', error);
              throw error;
          }
      }
  }
  
  // Insert remaining records
  if (batch.length > 0) {
      await db.sales.insertMany(batch);
  }
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Completed: ${totalRecords.toLocaleString()} records inserted in ${totalTime} seconds`);
}

insertData(1000000);

db.sales.find({}).limit(100);
db.sales.deleteMany({});

db.sales.countDocuments();

db.sales.aggregate([
  {
    $group: {
      _id: {
        item: "$product",
        month: { $month: "$saleDate" },
        year: { $year: "$saleDate" }
      },
      totalQuantity: { $sum: "$quantity" },
      totalAmount: { $sum: "$totalAmount"  }
    }
  },
  {
    $project: {
      item: "$_id.item",
      month: "$_id.month",
      year: "$_id.year",
      totalQuantity: 1,
      totalAmount: 1,
      _id: 0
    }
  },
  {
    $sort: { year: 1, month: 1, item: 1 }
  }
]);

db.sales.find({}).limit(10);

// Generate random date between start and end
function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Generate random price between min and max
function randomPrice(min, max) {
    return Number((Math.random() * (max - min) + min).toFixed(2));
}

// Generate random quantity between min and max
function randomQuantity(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Array of sample products
const products = [
    { name: "Laptop", category: "Electronics", basePrice: 999 },
    { name: "Smartphone", category: "Electronics", basePrice: 699 },
    { name: "Headphones", category: "Electronics", basePrice: 199 },
    { name: "T-Shirt", category: "Clothing", basePrice: 29 },
    { name: "Jeans", category: "Clothing", basePrice: 79 },
    { name: "Sneakers", category: "Footwear", basePrice: 89 }
];

// Array of sample locations
const locations = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix"];

// Batch insert function
async function insertSalesData(batchSize = 1000, totalRecords = 1000000) {
    const startTime = Date.now();
    const startDate = new Date('2023-01-01');
    const endDate = new Date('2023-12-31');
    
    let inserted = 0;
    let batch = [];
    
    console.log(`Starting insertion of ${totalRecords} records...`);
    
    while (inserted < totalRecords) {
        // Generate a sales record
        const product = products[Math.floor(Math.random() * products.length)];
        const location = locations[Math.floor(Math.random() * locations.length)];
        const quantity = randomQuantity(1, 10);
        const basePrice = product.basePrice;
        const priceVariation = basePrice * 0.2; // 20% price variation
        const unitPrice = randomPrice(basePrice - priceVariation, basePrice + priceVariation);
        
        const sale = {
            product: product.name,
            category: product.category,
            quantity: quantity,
            unitPrice: unitPrice,
            totalAmount: Number((quantity * unitPrice).toFixed(2)),
            location: location,
            saleDate: randomDate(startDate, endDate),
            createdAt: new Date()
        };
        
        batch.push(sale);
        
        // Insert batch when it reaches batchSize
        if (batch.length === batchSize) {
            try {
                await db.sales.insertMany(batch, { ordered: false });
                inserted += batch.length;
                
                // Progress logging
                const progress = (inserted / totalRecords * 100).toFixed(2);
                const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
                const rate = (inserted / elapsedSeconds).toFixed(1);
                
                console.log(`Progress: ${progress}% (${inserted.toLocaleString()} records)`);
                console.log(`Rate: ${rate} records/second`);
                
                batch = [];
            } catch (error) {
                console.error('Error inserting batch:', error);
                throw error;
            }
        }
    }
    
    // Insert remaining records
    if (batch.length > 0) {
        await db.sales.insertMany(batch, { ordered: false });
    }
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Completed: ${totalRecords.toLocaleString()} records inserted in ${totalTime} seconds`);
}

// Create indexes before insertion
async function setupIndexes() {
    console.log('Creating indexes...');
    await db.sales.createIndex({ saleDate: 1 });
    await db.sales.createIndex({ product: 1 });
    await db.sales.createIndex({ category: 1 });
    await db.sales.createIndex({ location: 1 });
    console.log('Indexes created');
}

// Main execution function
async function main() {
    try {
        await setupIndexes();
        await insertSalesData(1000, 1000000); // 1000 batch size, 1M records
        
        // Verify count
        const count = await db.sales.countDocuments();
        console.log(`Total documents in collection: ${count.toLocaleString()}`);
        
        // Sample query to verify data
        const sample = await db.sales.findOne();
        console.log('Sample document:', sample);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Execute the insertion
main();

// Example queries to analyze the data after insertion
async function analyzeData() {
    // Sales by category
    const salesByCategory = await db.sales.aggregate([
        {
            $group: {
                _id: "$category",
                totalSales: { $sum: "$totalAmount" },
                averageQuantity: { $avg: "$quantity" },
                count: { $sum: 1 }
            }
        },
        { $sort: { totalSales: -1 } }
    ]).toArray();
    
    console.log('Sales by Category:', salesByCategory);
    
    // Monthly sales trend
    const monthlySales = await db.sales.aggregate([
        {
            $group: {
                _id: {
                    year: { $year: "$saleDate" },
                    month: { $month: "$saleDate" }
                },
                totalSales: { $sum: "$totalAmount" },
                count: { $sum: 1 }
            }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]).toArray();
    
    console.log('Monthly Sales Trend:', monthlySales);
}
