/**
 *  ========================================================================================
 *  WORKER-DB: EL ARQUITECTO DE TU PROPIA BASE DE DATOS (EDICION PA VALIENTES Y BETICOS)
 *  ========================================================================================
 */

export default {
  // Esta funcion fetch es como el portero que escucha cuando alguien llama a la puerta.
  async fetch(request, env) {
    
    // 1. EL PORTERO DE LA DISCOTECA (Manejo de CORS)
    // Cuando el navegador pregunta "¿Puedo pasar?", le decimos "Pasa sin problema".
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    // Solo aceptamos paquetes con datos de construcción (POST)
    if (request.method !== "POST") {
      return new Response("Método no permitido. Usa POST.", { status: 405 });
    }

    try {
      // 2. ABRIMOS EL PAQUETE QUE VIENE DEL FRONTEND
      const body = await request.json();
      const { users, baseBudget } = body; // Extraemos los nombres y el dinero base

      // 3. LOS PLANOS DE CONSTRUCCIÓN (Sentencias SQL - DDL)
      
      // Tabla Usuarios: 'nombre' es el identificador único. 'device_token' es el ID criptográfico.
      const createUsuarios = `
        CREATE TABLE IF NOT EXISTS Usuarios (
          nombre TEXT PRIMARY KEY,
          device_token TEXT
        );
      `;

      // Tabla Gastos: Auto-explicativa, guardamos todo el ticket del gasto.
      const createGastos = `
        CREATE TABLE IF NOT EXISTS Gastos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER,
          concepto TEXT,
          descripcion TEXT,
          precio REAL,
          usuario TEXT
        );
      `;

      // Tabla Presupuestos: Usaremos 'semana_id' como clave (Ej: "2026-W13"). 
      // El presupuesto base se guardará con el ID especial 'BASE'.
      const createPresupuestos = `
        CREATE TABLE IF NOT EXISTS Presupuestos (
          semana_id TEXT PRIMARY KEY,
          cantidad REAL
        );
      `;

      // 4. CONSTRUIMOS EL EDIFICIO
      // Usamos env.DB.batch para lanzar las 3 órdenes a la vez, optimizando el rendimiento al máximo.
      await env.DB.batch([
        env.DB.prepare(createUsuarios),
        env.DB.prepare(createGastos),
        env.DB.prepare(createPresupuestos)
      ]);

      // 5. HACEMOS LIMPIEZA Y METEMOS LOS MUEBLES (Datos Base)
      // Vaciamos primero por si el usuario le dio a "Crear" dos veces sin querer
      await env.DB.prepare("DELETE FROM Usuarios").run();
      await env.DB.prepare("DELETE FROM Presupuestos").run();

      // Preparamos los "huecos" para los usuarios. 
      // El device_token se queda en NULL hasta que inicien sesión.
      const userInserts = users.map(user => 
        env.DB.prepare("INSERT INTO Usuarios (nombre, device_token) VALUES (?, NULL)").bind(user)
      );

      // Metemos el dinero base en el sistema con el identificador 'BASE'
      const budgetInsert = env.DB.prepare("INSERT INTO Presupuestos (semana_id, cantidad) VALUES ('BASE', ?)").bind(baseBudget);

      // Ejecutamos las inserciones
      await env.DB.batch([...userInserts, budgetInsert]);

      // 6. LE DECIMOS AL FRONTEND QUE TODO ESTÁ LISTO
      return new Response(JSON.stringify({ success: true, message: "¡Base de datos construida con éxito!" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });

    } catch (error) {
      // Si explota algo en la obra, avisamos por radio
      console.error("Error al construir la DB:", error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }
};