export default {
  // El "Fetch" es la puerta de entrada de todas las peticiones
  async fetch(request, env) {
    
    // 1. EL SALUDO (CORS) - Permitimos que tu app se comunique sin bloqueos de seguridad del navegador
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Device-Token"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // --- FUNCIÓN DE AYUDA: Para responder siempre en JSON bonito ---
    const jsonResponse = (data, status = 200) => 
      new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    try {
      // 2. LEER LA COMANDA
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;
      
      // Extraemos el DNI criptográfico que manda la app en cada petición
      const deviceToken = request.headers.get("X-Device-Token");

      // =====================================================================
      // 3. DEPARTAMENTO DE LOGIN (Ruta Pública)
      // =====================================================================
      if (path === "/api/login" && method === "POST") {
        const body = await request.json();
        const username = body.username;
        const tokenToUse = body.deviceToken || deviceToken;

        // Buscamos si el usuario existe en la tabla Usuarios
        const user = await env.DB.prepare("SELECT * FROM Usuarios WHERE nombre = ?").bind(username).first();
        
        if (!user) {
          // Escenario C: No existe
          return jsonResponse({ error: "El usuario no existe en la base de datos." }, 401);
        }

        if (!user.device_token) {
          // Escenario A: Existe pero no tiene ID aún. Lo vinculamos
          await env.DB.prepare("UPDATE Usuarios SET device_token = ? WHERE nombre = ?").bind(tokenToUse, username).run();
          return jsonResponse({ success: true, message: "Dispositivo vinculado correctamente." });
        
        } else if (user.device_token === tokenToUse) {
          // Escenario B (Éxito): Tiene ID y coincide perfectamente
          return jsonResponse({ success: true, message: "Sesión iniciada." });
        
        } else {
          // Escenario B (Fallo): Tiene ID pero es distinto (es otro móvil)
          return jsonResponse({ error: "Dispositivo no autorizado. Pide a un admin que borre tu ID viejo." }, 403);
        }
      }

      // =====================================================================
      // 4. CONTROL DE SEGURIDAD GLOBAL (El "Bouncer")
      // =====================================================================
      // Si la petición NO es al login, exigimos el token sí o sí
      if (!deviceToken) return jsonResponse({ error: "Falta la huella de seguridad (X-Device-Token)." }, 401);

      // Buscamos a quién le pertenece este DNI para saber de quién son los gastos
      const userLogueado = await env.DB.prepare("SELECT nombre FROM Usuarios WHERE device_token = ?").bind(deviceToken).first();
      if (!userLogueado) return jsonResponse({ error: "Token inválido o cuenta desvinculada." }, 401);
      
      const miUsuario = userLogueado.nombre;

      // =====================================================================
      // 5. DEPARTAMENTO DE GASTOS
      // =====================================================================
      if (path.startsWith("/api/expenses")) {
        
        // Extraemos el ID si la URL lo trae (Ej: /api/expenses/15)
        const partesURL = path.split("/");
        // Corregido: Obtenemos el elemento 3 del array para tener el ID real
        const idGasto = partesURL.length === 4 ? partesURL[3] : null;

        // LEER GASTOS (Dashboard)
        if (method === "GET") {
          const start = url.searchParams.get("start");
          const end = url.searchParams.get("end");
          const gastos = await env.DB.prepare(
            "SELECT * FROM Gastos WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp DESC"
          ).bind(start, end).all();
          
          // Ya no mapeamos a inglés, devolvemos el resultado puro de D1 (que ya usa concepto/precio)
          const gastosRes = gastos.results.map(g => ({ ...g, username: g.usuario }));
          return jsonResponse({ expenses: gastosRes });
        }
        
        // AÑADIR GASTO NUEVO
        if (method === "POST") {
          const body = await request.json();
          await env.DB.prepare(
            "INSERT INTO Gastos (concepto, descripcion, precio, timestamp, usuario) VALUES (?, ?, ?, ?, ?)"
          ).bind(body.concepto, body.descripcion, body.precio, body.timestamp, miUsuario).run();
          return jsonResponse({ success: true });
        }

        // BORRAR GASTO
        if (method === "DELETE" && idGasto) {
          // Exigimos 'usuario = miUsuario' para que nadie borre gastos de otra persona
          await env.DB.prepare("DELETE FROM Gastos WHERE id = ? AND usuario = ?").bind(idGasto, miUsuario).run();
          return jsonResponse({ success: true });
        }

        // EDITAR GASTO
        if (method === "PUT" && idGasto) {
          const body = await request.json();
          await env.DB.prepare(
            "UPDATE Gastos SET concepto = ?, descripcion = ?, precio = ?, timestamp = ? WHERE id = ? AND usuario = ?"
          ).bind(body.concepto, body.descripcion, body.precio, body.timestamp, idGasto, miUsuario).run();
          return jsonResponse({ success: true });
        }
      }

      // =====================================================================
      // 6. DEPARTAMENTO DE PRESUPUESTOS (La magia de las excepciones)
      // =====================================================================
      if (path === "/api/budget") {
        
        // LEER EL PRESUPUESTO
        if (method === "GET") {
          const weekId = url.searchParams.get("weekId");
          
          // 1. Buscamos si hay una excepción semanal específica (Ej: '2026-W13')
          let presupuesto = await env.DB.prepare("SELECT cantidad FROM Presupuestos WHERE semana_id = ?").bind(weekId).first();
          
          // 2. Si no hay excepción, cargamos el presupuesto 'BASE'
          if (!presupuesto) {
            presupuesto = await env.DB.prepare("SELECT cantidad FROM Presupuestos WHERE semana_id = 'BASE'").first();
          }
          
          return jsonResponse({ budget: presupuesto ? presupuesto.cantidad : 0 });
        }
        
        // CREAR UNA EXCEPCIÓN SEMANAL (Al pulsar la píldora y editar)
        if (method === "POST") {
          const body = await request.json();
          // Usamos INSERT OR REPLACE (Upsert) por si el usuario cambia de idea y la edita 3 veces
          await env.DB.prepare(
            "INSERT OR REPLACE INTO Presupuestos (semana_id, cantidad) VALUES (?, ?)"
          ).bind(body.weekId, body.precio).run();
          
          return jsonResponse({ success: true });
        }
      }

      // Si nos piden otra cosa
      return jsonResponse({ error: "Ruta no encontrada" }, 404);

    } catch (error) {
      console.error("Error catastrófico en Worker:", error);
      return jsonResponse({ error: "Error interno del servidor: " + error.message }, 500);
    }
  }
};