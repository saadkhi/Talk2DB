const fs = require('fs');
let content = fs.readFileSync('nextjs-app/src/app/api/profile/route.ts', 'utf8');

// 1. Move anomalies declaration
content = content.replace('let stats: any = { nullCount, nullPct, distinctCount };', 
    'let stats: any = { nullCount, nullPct, distinctCount };\n                const anomalies: string[] = [];');
content = content.replace('                const anomalies: string[] = [];\n                if (nullPct > 50) {', 
    '                if (nullPct > 50) {');

// 2. Add Z-score
const numericBlockTarget = `                            avg: numResult.rows[0].avg != null ? Number(numResult.rows[0].avg) : null,
                        };
                    } catch (eNum) {`;

const numericBlockReplacement = `                            avg: numResult.rows[0].avg != null ? Number(numResult.rows[0].avg) : null,
                        };

                        // Outlier Detection (Z-Score)
                        const stddevResult = await pool.query(
                            \`SELECT STDDEV("\${column_name}") as stddev FROM "\${tableName}"\`
                        );
                        const stddev = stddevResult.rows[0].stddev != null ? Number(stddevResult.rows[0].stddev) : null;
                        if (stddev != null && stddev > 0 && stats.avg != null) {
                            const outliersResult = await pool.query(
                                \`SELECT COUNT(*) as count FROM "\${tableName}" WHERE "\${column_name}" IS NOT NULL AND ABS("\${column_name}" - $1) / $2 > 3\`,
                                [stats.avg, stddev]
                            );
                            const outliersCount = parseInt(outliersResult.rows[0].count);
                            if (outliersCount > 0) {
                                anomalies.push(\`Statistical Outliers: \${outliersCount} value(s) exceed Z-Score of 3\`);
                            }
                        }
                    } catch (eNum) {`;

content = content.replace(numericBlockTarget, numericBlockReplacement);

fs.writeFileSync('nextjs-app/src/app/api/profile/route.ts', content);
