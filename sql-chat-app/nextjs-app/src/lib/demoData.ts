/**
 * demoData.ts
 *
 * Embedded demo dataset used for unauthenticated (guest) users.
 * Simulates a small e-commerce business database so every tool
 * (Query Studio, Visualizer, Report Builder, Schema Explorer,
 *  Data Profiler, Database Browser) has meaningful data to work with.
 *
 * Schema:
 *   customers  – 20 rows
 *   products   – 15 rows
 *   orders     – 30 rows
 *   order_items – 60 rows
 *   employees  – 10 rows
 */

export interface DemoColumn {
    name: string;
    type: string;
    isPrimary?: boolean;
    nullable?: boolean;
}

export interface DemoTable {
    name: string;
    rowCount: number;
    columns: DemoColumn[];
    rows: Record<string, unknown>[];
}

/* ─── customers ─────────────────────────────────────────────────────────── */
const customers: DemoTable = {
    name: "customers",
    rowCount: 20,
    columns: [
        { name: "id",         type: "integer",          isPrimary: true,  nullable: false },
        { name: "name",       type: "character varying", isPrimary: false, nullable: false },
        { name: "email",      type: "character varying", isPrimary: false, nullable: false },
        { name: "country",    type: "character varying", isPrimary: false, nullable: true  },
        { name: "created_at", type: "timestamp",         isPrimary: false, nullable: false },
        { name: "is_premium", type: "boolean",           isPrimary: false, nullable: false },
    ],
    rows: [
        { id:1,  name:"Alice Martin",    email:"alice@example.com",   country:"USA",     created_at:"2024-01-05", is_premium:true  },
        { id:2,  name:"Bob Chen",        email:"bob@example.com",     country:"Canada",  created_at:"2024-01-18", is_premium:false },
        { id:3,  name:"Clara Diaz",      email:"clara@example.com",   country:"Mexico",  created_at:"2024-02-03", is_premium:true  },
        { id:4,  name:"David Kim",       email:"david@example.com",   country:"Korea",   created_at:"2024-02-14", is_premium:false },
        { id:5,  name:"Eva Rossi",       email:"eva@example.com",     country:"Italy",   created_at:"2024-03-01", is_premium:true  },
        { id:6,  name:"Frank Müller",    email:"frank@example.com",   country:"Germany", created_at:"2024-03-20", is_premium:false },
        { id:7,  name:"Grace Li",        email:"grace@example.com",   country:"China",   created_at:"2024-04-07", is_premium:true  },
        { id:8,  name:"Hiro Tanaka",     email:"hiro@example.com",    country:"Japan",   created_at:"2024-04-22", is_premium:false },
        { id:9,  name:"Isla Brown",      email:"isla@example.com",    country:"UK",      created_at:"2024-05-10", is_premium:true  },
        { id:10, name:"James Osei",      email:"james@example.com",   country:"Ghana",   created_at:"2024-05-28", is_premium:false },
        { id:11, name:"Karen Patel",     email:"karen@example.com",   country:"India",   created_at:"2024-06-05", is_premium:true  },
        { id:12, name:"Luis García",     email:"luis@example.com",    country:"Spain",   created_at:"2024-06-19", is_premium:false },
        { id:13, name:"Mia Johansson",   email:"mia@example.com",     country:"Sweden",  created_at:"2024-07-02", is_premium:true  },
        { id:14, name:"Noah Williams",   email:"noah@example.com",    country:"USA",     created_at:"2024-07-15", is_premium:false },
        { id:15, name:"Olivia Tremblay", email:"olivia@example.com",  country:"Canada",  created_at:"2024-08-01", is_premium:true  },
        { id:16, name:"Pedro Santos",    email:"pedro@example.com",   country:"Brazil",  created_at:"2024-08-14", is_premium:false },
        { id:17, name:"Quinn Hughes",    email:"quinn@example.com",   country:"UK",      created_at:"2024-09-03", is_premium:true  },
        { id:18, name:"Rachel Novak",    email:"rachel@example.com",  country:"Poland",  created_at:"2024-09-20", is_premium:false },
        { id:19, name:"Sam Weber",       email:"sam@example.com",     country:"Germany", created_at:"2024-10-05", is_premium:true  },
        { id:20, name:"Tina Nguyen",     email:"tina@example.com",    country:"Vietnam", created_at:"2024-10-18", is_premium:false },
    ],
};

/* ─── products ──────────────────────────────────────────────────────────── */
const products: DemoTable = {
    name: "products",
    rowCount: 15,
    columns: [
        { name: "id",       type: "integer",          isPrimary: true,  nullable: false },
        { name: "name",     type: "character varying", isPrimary: false, nullable: false },
        { name: "category", type: "character varying", isPrimary: false, nullable: false },
        { name: "price",    type: "numeric",           isPrimary: false, nullable: false },
        { name: "stock",    type: "integer",           isPrimary: false, nullable: false },
    ],
    rows: [
        { id:1,  name:"Wireless Headphones", category:"Electronics", price:89.99,  stock:142 },
        { id:2,  name:"USB-C Hub",           category:"Electronics", price:34.50,  stock:310 },
        { id:3,  name:"Mechanical Keyboard", category:"Electronics", price:124.00, stock:87  },
        { id:4,  name:"Desk Lamp",           category:"Home Office", price:45.00,  stock:200 },
        { id:5,  name:"Ergonomic Chair",     category:"Furniture",   price:349.99, stock:42  },
        { id:6,  name:"Standing Desk",       category:"Furniture",   price:499.00, stock:28  },
        { id:7,  name:"Notebook (A5)",       category:"Stationery",  price:7.99,   stock:500 },
        { id:8,  name:"Premium Pen Set",     category:"Stationery",  price:19.50,  stock:280 },
        { id:9,  name:"Webcam HD",           category:"Electronics", price:69.00,  stock:156 },
        { id:10, name:"Monitor 27\"",        category:"Electronics", price:329.00, stock:63  },
        { id:11, name:"Mouse Pad XL",        category:"Accessories", price:24.99,  stock:400 },
        { id:12, name:"Cable Organizer",     category:"Accessories", price:12.50,  stock:600 },
        { id:13, name:"Bookshelf",           category:"Furniture",   price:189.00, stock:55  },
        { id:14, name:"Whiteboard",          category:"Home Office", price:75.00,  stock:110 },
        { id:15, name:"Laptop Stand",        category:"Accessories", price:38.00,  stock:240 },
    ],
};

/* ─── employees ─────────────────────────────────────────────────────────── */
const employees: DemoTable = {
    name: "employees",
    rowCount: 10,
    columns: [
        { name: "id",         type: "integer",          isPrimary: true,  nullable: false },
        { name: "name",       type: "character varying", isPrimary: false, nullable: false },
        { name: "department", type: "character varying", isPrimary: false, nullable: false },
        { name: "salary",     type: "numeric",           isPrimary: false, nullable: false },
        { name: "hire_date",  type: "date",              isPrimary: false, nullable: false },
    ],
    rows: [
        { id:1,  name:"Sarah Connor",  department:"Engineering", salary:95000, hire_date:"2021-03-15" },
        { id:2,  name:"John Smith",    department:"Sales",       salary:62000, hire_date:"2020-07-01" },
        { id:3,  name:"Priya Patel",   department:"Engineering", salary:98000, hire_date:"2019-11-20" },
        { id:4,  name:"Mike Johnson",  department:"Marketing",   salary:70000, hire_date:"2022-01-10" },
        { id:5,  name:"Linda Zhang",   department:"Engineering", salary:102000,hire_date:"2018-05-22" },
        { id:6,  name:"Tom Baker",     department:"Sales",       salary:58000, hire_date:"2023-02-14" },
        { id:7,  name:"Anna Kowalski", department:"HR",          salary:67000, hire_date:"2021-09-30" },
        { id:8,  name:"Carlos Vega",   department:"Marketing",   salary:75000, hire_date:"2020-04-11" },
        { id:9,  name:"Emma Wilson",   department:"HR",          salary:64000, hire_date:"2022-08-05" },
        { id:10, name:"James Park",    department:"Engineering", salary:110000,hire_date:"2017-12-01" },
    ],
};

/* ─── orders ────────────────────────────────────────────────────────────── */
const orders: DemoTable = {
    name: "orders",
    rowCount: 30,
    columns: [
        { name: "id",          type: "integer", isPrimary: true,  nullable: false },
        { name: "customer_id", type: "integer", isPrimary: false, nullable: false },
        { name: "total",       type: "numeric", isPrimary: false, nullable: false },
        { name: "status",      type: "character varying", isPrimary: false, nullable: false },
        { name: "created_at",  type: "date",    isPrimary: false, nullable: false },
        { name: "month",       type: "character varying", isPrimary: false, nullable: false },
    ],
    rows: [
        { id:1,  customer_id:3,  total:249.00, status:"completed", created_at:"2024-01-12", month:"Jan" },
        { id:2,  customer_id:7,  total:89.99,  status:"completed", created_at:"2024-01-20", month:"Jan" },
        { id:3,  customer_id:1,  total:499.00, status:"completed", created_at:"2024-02-05", month:"Feb" },
        { id:4,  customer_id:15, total:34.50,  status:"pending",   created_at:"2024-02-14", month:"Feb" },
        { id:5,  customer_id:9,  total:174.00, status:"completed", created_at:"2024-02-28", month:"Feb" },
        { id:6,  customer_id:5,  total:329.00, status:"completed", created_at:"2024-03-08", month:"Mar" },
        { id:7,  customer_id:11, total:45.00,  status:"completed", created_at:"2024-03-15", month:"Mar" },
        { id:8,  customer_id:2,  total:62.50,  status:"cancelled", created_at:"2024-03-22", month:"Mar" },
        { id:9,  customer_id:17, total:848.99, status:"completed", created_at:"2024-04-03", month:"Apr" },
        { id:10, customer_id:4,  total:124.00, status:"completed", created_at:"2024-04-10", month:"Apr" },
        { id:11, customer_id:13, total:214.50, status:"pending",   created_at:"2024-04-20", month:"Apr" },
        { id:12, customer_id:8,  total:69.00,  status:"completed", created_at:"2024-05-05", month:"May" },
        { id:13, customer_id:19, total:389.99, status:"completed", created_at:"2024-05-18", month:"May" },
        { id:14, customer_id:6,  total:75.00,  status:"completed", created_at:"2024-05-25", month:"May" },
        { id:15, customer_id:20, total:538.00, status:"completed", created_at:"2024-06-02", month:"Jun" },
        { id:16, customer_id:12, total:27.49,  status:"cancelled", created_at:"2024-06-14", month:"Jun" },
        { id:17, customer_id:14, total:163.00, status:"completed", created_at:"2024-06-22", month:"Jun" },
        { id:18, customer_id:16, total:499.00, status:"completed", created_at:"2024-07-07", month:"Jul" },
        { id:19, customer_id:10, total:94.49,  status:"pending",   created_at:"2024-07-19", month:"Jul" },
        { id:20, customer_id:18, total:312.00, status:"completed", created_at:"2024-07-30", month:"Jul" },
        { id:21, customer_id:1,  total:44.00,  status:"completed", created_at:"2024-08-06", month:"Aug" },
        { id:22, customer_id:3,  total:659.99, status:"completed", created_at:"2024-08-15", month:"Aug" },
        { id:23, customer_id:7,  total:189.00, status:"completed", created_at:"2024-08-28", month:"Aug" },
        { id:24, customer_id:5,  total:124.00, status:"cancelled", created_at:"2024-09-04", month:"Sep" },
        { id:25, customer_id:11, total:478.50, status:"completed", created_at:"2024-09-17", month:"Sep" },
        { id:26, customer_id:9,  total:75.00,  status:"completed", created_at:"2024-09-25", month:"Sep" },
        { id:27, customer_id:15, total:329.00, status:"completed", created_at:"2024-10-02", month:"Oct" },
        { id:28, customer_id:17, total:38.00,  status:"pending",   created_at:"2024-10-14", month:"Oct" },
        { id:29, customer_id:2,  total:214.00, status:"completed", created_at:"2024-10-22", month:"Oct" },
        { id:30, customer_id:13, total:561.49, status:"completed", created_at:"2024-11-01", month:"Nov" },
    ],
};

/* ─── order_items ───────────────────────────────────────────────────────── */
const order_items: DemoTable = {
    name: "order_items",
    rowCount: 60,
    columns: [
        { name: "id",         type: "integer", isPrimary: true,  nullable: false },
        { name: "order_id",   type: "integer", isPrimary: false, nullable: false },
        { name: "product_id", type: "integer", isPrimary: false, nullable: false },
        { name: "quantity",   type: "integer", isPrimary: false, nullable: false },
        { name: "unit_price", type: "numeric", isPrimary: false, nullable: false },
    ],
    rows: Array.from({ length: 60 }, (_, i) => ({
        id: i + 1,
        order_id: (i % 30) + 1,
        product_id: (i % 15) + 1,
        quantity: (i % 4) + 1,
        unit_price: products.rows[(i % 15)].price,
    })),
};

/* ─── Exported tables map ────────────────────────────────────────────────── */
export const DEMO_TABLES: Record<string, DemoTable> = {
    customers,
    products,
    employees,
    orders,
    order_items,
};

export const DEMO_TABLE_LIST: DemoTable[] = Object.values(DEMO_TABLES);

/**
 * Run a very simple in-memory "SQL-like" query against the demo data.
 * Supports:  SELECT * FROM table [LIMIT n]
 *            SELECT col1, col2 FROM table [LIMIT n]
 * Returns { columns, rows } or throws if the table is not found.
 */
export function runDemoQuery(sql: string): { columns: string[]; rows: Record<string, unknown>[] } {
    const clean = sql.replace(/;\s*$/, "").trim();

    // Extract LIMIT
    const limitMatch = clean.match(/\bLIMIT\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1], 10) : 500;

    // Extract FROM table
    const fromMatch = clean.match(/\bFROM\s+"?(\w+)"?/i);
    if (!fromMatch) throw new Error("Could not find FROM clause in query.");
    const tableName = fromMatch[1].toLowerCase();

    const table = DEMO_TABLES[tableName];
    if (!table) {
        throw new Error(
            `Table "${tableName}" not found in demo dataset. Available tables: ${Object.keys(DEMO_TABLES).join(", ")}.`
        );
    }

    // Extract SELECT columns
    const selectMatch = clean.match(/^SELECT\s+([\s\S]+?)\s+FROM/i);
    const selectRaw = selectMatch ? selectMatch[1].trim() : "*";

    let columns: string[];
    if (selectRaw === "*") {
        columns = table.columns.map(c => c.name);
    } else {
        columns = selectRaw.split(",").map(s => s.trim().replace(/"/g, "").split(/\s+as\s+/i)[0].trim());
        // Validate columns exist
        const validCols = new Set(table.columns.map(c => c.name));
        columns = columns.filter(c => validCols.has(c));
        if (columns.length === 0) columns = table.columns.map(c => c.name);
    }

    const rows = table.rows
        .slice(0, limit)
        .map(row => {
            const out: Record<string, unknown> = {};
            for (const col of columns) out[col] = row[col] ?? null;
            return out;
        });

    return { columns, rows };
}
