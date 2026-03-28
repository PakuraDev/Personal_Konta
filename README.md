<div align="center">
  <h1>Kroma Startpage</h1>
  <img src="konta.png" width="100%" />
</div>

---

## Links

Figma: https://www.figma.com/design/whzvUpnmXPRucAcqazPn2m/Konta-V2?node-id=0-1&t=PSkuYnStfNZ6JBZq-1

Página: https://personal-konta.pages.dev/

---

## Konta (resumen)
Konta es una app de gestión de gastos semanales simples (hecha principalmente para mi familia y yo) para apuntar apuntar gastos y llevar el control del presupuesto semanal. 

A nivel de diseño he usado un estilo Neo-Brutalista minimalista (nuevamente os podréis dar cuenta de cual es mi estilo favorito) con una UX a prueba de padres (literalmente, mis padres saben usar la app), pero no solo me he conformado con una buena UX, también he intentado hacer una DX (Developer experience) de libro.

A nivel de código volvemos al amor mi vida, JAMstack (Javascript, API, Marcado (html y css son lenguajes de marcado)) con JS (semi) Vanilla, usando solo 2 librerías para dar soporte completo a Apple (que a saber cuando empiezan a dar soporte a APIs nativas que cualquier navegador de android tiene), css puro, y mi querido cloudflare.

## Funciones
Vamoh a empezar (siempre hago una broma andaluza aquí, parezco gilipo...). Si bien es cierto que no estamos ante una app sumanente compleja (de hecho busco lo contrario, que sea simple), voy a omitir las funciones técnicas para centrarme en las funciones de la app, la que todos los usuarios van a usar (sin necesidad de tocar o configurar un solo worker).

### Login sin fricción y seguridad:
Esto no es una función que vais a ver, pero si de la que váis a disfrutar. La arquitectura base es frágil a nivel de seguridad, quiero decir, cualquier persona con la url podría acceder a vuestros gastos, por eso añadí ciertas cositas que complicarán la vida a niveles insospechados de aquellos con malas intenciones. 

Pero primero, vamos con el login. Para el usuario promedio, simplemente tendrá que introducir un usuario (que el creador le tiene que dar), y escanear un QR (que nuevamente el admin le tiene que dar). La idea del QR scan se basa en que escribir la url de un worker es un coñazo, con todo respeto, así que es mucho mejor escribirla una sola vez (al admin), y ya luego que el resto de usuarios puedan escanearla para evitar posibles errores o fricción.

Por otra parte, el meter una contraseña hubiera sido un punto de fricción para alguien que simplemente quiere apuntar lo que le cuesta al pan, así que se hizo una contraseña invisible. El móvil genera una clave (UUID v4) con la API nativa de criptografía del navegador (especificamente la crypto.subtle), y esa clave se manda a la base de datos (D1). 

El worker (lo que modifica la base de datos) pide el usuario y esa clave, que se guarda a nivel de localstorage, y si concuerda con la que hay en D1, aprueba la acción que el usuario intenta hacer. Si bien es cierto que esta arquitectura es susceptible a ataques XSS (Cross-Site Scripting) basados en el DOM, no es un riesgo real en este contexto, y luego explicaré el porque.

### Presupuesto base modificable:
Hay un presupuesto base que afecta a todas las semanas salvo aquellas que tienen una excepción, y esto es lo importante: Haciendo click en el presupuesto (lo que pone presupuesto actual/presupuesto máximo (ej: 240/250)) en la pantalla dashboard, podemos ingresar un presupuesto personalizable para esa semana.

### Registros de otras semanas.
Dentro del menu lateral, podemos explorar cualquier semana que ya haya pasado o por explorar. Si había gastos en esa semana, nos permitirá verlos.

### Las funcionas básicas lógicas que deben estar:
Obviamente, existe la función para registrar los gastos, para compartir el QR, para cerrar sesión (cuando se cierra sesión, la clave se queda igual, de forma que podamos volver a iniciar sesión sin tocar la base de datos), visor de presupuesto en tiempo real, visor de gastos en detalles, y poco más.


## Diseño:
A nivel de UI no hay demasiado de lo que hablar, como ya sabréis, un buen diseño es aquel que no se nota, y dentro de lo que cabe el minimalismo o neo-brutalismo no da mucho de lo que hablar, quiero decir, no hay dirección de arte como tal, simplemente es estructura y utilitarismo. Sin embargo, si hay algo de lo que hablar. 

El modo de alto contraste (aunque técnicamente no sé si se puede llamar así dado que en algunas pruebas, por pocos puntos, el azul y negro no consiguen pasar la prueba AAA), el cuál cambia los textos azules sobre fondo blanco, y textos blancos sobre fondo azul para hacerlos negros y cumplir con la WCAG 2.1 (y hablando de esto, también he descargado las fuentes porque usar la api de google fonts requiere poner un banner de cookies).

Pero hay algo que siempre da de que hablar, y eso es el UX, aunque hoy además vamos a tener un invitado especial, el DX. Como creo que he comentado al principio, la app la van a usar mis padres (+50 años), por lo que la ux nos pide una curva de aprendizaje muy baja. Sin embargo, aquí tenemos un problema, y es que la app necesita alguien que configure la base de datos (que como explicaré más adelante, tampoco es muy difícil), así que la UX se divide en UX (para el usuario promedio), y DX (para el que se encargue de configurar la base de datos). 

### UX:
Como el usuario promedio probablemente será mayor tenemos que reducir la carga cognitiva y fracción todo lo posible. Por eso mismo la primera pantalla se compone de un header dando la bienvenida, y un formulario de tan solo 2 inputs, el usuario, y la url. Pero claro, para una persona mayor escribir una url puede ser confuso, así que añadí la opción de escanear QR, y a su vez, de generarlo. 

Aquí también entrá la decisión de la contraseña invisible. Una persona mayor ni quiere crear ni quiere recordar una contraseña para algo tan "tonto" como apuntar gastos, por eso lo eliminamos y lo hacemos invisible, reduciendo la fricción y opciones. Una vez relleno todo eso, el siguiente paso lógico será darle al botón de Iniciar sesión. 

Todos los datos se guardan en el dispositivo, de forma que la proxima vez que entre directamente le llevará al dashboard. Hablando del dashbaord, este se compone nuevamente de header y contenido principal (los gastos). La app le saluda con su usuario, le pone en grande el dinero que queda, y abajo ponen los gastos. El menu lateral no es necesario para el usuario promedio, y el botón de añadir registro está en la misma posición que el botón de iniciar sesión, con la misma forma y color, lo cual junto a la memoria cognitiva no le hace pensar demasiado para saber como debe interactuar con el botón.

El registro de un gasto es igual de sencillo, 3 inputs y el botón en el mismo botón. Si quieres editar o ver más detalles, tan solo tienes que hacer click en el gasto y saldrá un modal. Antes era una página aparte, pero noté que a mis padres les confundía y les costaba salir, así que el modal es una solución para que el usuario sepa que sigue en el mismo lado. 

Además he añadido los botones de editar y borrar, lo cuál en la anterior versión no estaba y tuve que meter para dejar de borrar gastos manualmente en supabase, porque en la anterior base también había un pequeño detalle que no tuve en cuenta, la impaciencia. Cuando la app tarda más de 1 segundo en responder, mi madre tendía a volver a darle al botón, haciendo que el gsato de duplique. Esto se ha solucionado limitando el uso del botón una vez, y cambiando de edge backend a cloudflare, que es infinitamnente más rápido. 

El botón para ver los gastos de otras semanas tenía un uso casi nulo, así que decidí quitarlo y meter la opción directamente en el menu lateral, reduciendo la fricción cognitiva al reducir las opciones en pantallas. Pero vamos a lo que me gusta, y es que la app es una PWA, es decir, es instalable como una app nativa, lo cual reduce muchisimo la fricción una vez instalada.

### DX:
Si bien me he preocupado por el usuario, al admin de la familia sale de igual forma bien parado. En una primera instacia mi idea fue que el worker-api tuviera código universal, pero que el worker-db tuviera los datos básicos (usuarios, presupuesto base) harcodeados como "medida de seguridad" (quiero decir, si los usuarios están limitados a 4 nombres, no puede entrar un desconocido), pero más tarde me dí cuenta que realmente se podía añadir en la interfaz y dejar el worker-db universal. 

Como resultado, la pantalla de inicio avanzada ahora tiene 2 inputs más, una para añadir el presupuesto base general, y otro para añadir el resto de usuarios. En el menu lateral además de añadió la opción de compartir el QR, para facilitar la distribución del enlace al worker, y además se ha añadido intrucciones dentro de la carpeta workers para que cualquier persona que sepa crear una cuenta en cloudflare sea capaz de crearlo.

En resumen, el usuario avanzado "solo" tiene que copiar el código de los workers, crear una base de datos (un botón, no es tan difícil como suena), rellenar 3 inputs más, y compartir el código qr de forma sencilla).

## Stack, arquitectura y seguridad.
Ahora hablemos de lo que me gusta, el código (porque os puedo asegurar que después de 8 horas de diseño de lo último que tengo ganas es de hablar de UI, UX, DX ni brutalismo).

### Stack:
Aunque os sorprenda (notese la ironia temprana), nuevamente he usado html, css puro y js (semi) vanilla + edge computing de cloudflare, lo que se llama JAMstack. He tenido que añadir una librería más de lo que me hubiera gustado por culpa de apple, aunque tampoco me voy a poner a criticarlos en directo, y poco más, el stack es muy sencillo. Quiero decir, la app es un cascarón que funciona gracias al edge computing de cloudflare.

### Arquitectura:
Como tampoco os será sorpresa, si no hago algo modular es porque no lo he hecho yo (literalmente, os invito a venir a mi ordenador que no vais a encontrar nada que no sea modular), así que he divido el frontend en assets y css. Assets tiene los svg y las imágenes para el service worker (que sea instalable) funcione, y el css lo divido en 2 archivos:

* `main.css`: Variables, sistema tipografíco, fuentes, reseteo y creo que nada más.
* `components.css`: Estructura, responsividad, modales, ui kit, etc... Este archivo es el culpable de que sea pixel perfect.

Para la lógica (js) se dividio en 4 archivos:
* `app.js`: El cerebro y portero de la app. Maneja el estado global, enrutamiento y la interacción del usuario.
* `api.js`: La capa de red. Se encarga de las peticiones fetch para comuniccarse con los workers.
* `crypto.js`: Como podreís adivinar, el guardia de seguridad. Usa el cripto.subtle para generar los tokens y gestionar la sesión.
* `utils.js`: La caja de herramientas para calcular, formatear y parsear cositas.

Para el almacenamiento me olvide de IndexdedDB (Hubiera usado un wrapper para no usar esa API, pero como no la habéis visto lo podéis haber adivinado, aunque creo que lo dije antes) y me decante por localstorage para guardar el token, usuario y url del worker-api. Por otra parte, antes se usaba edge computing pero con supabase. Mi decisión fue cambiarlo a cloudflare primero por rendimiento, segundo por comodidad, y tercero porque amo a cloudflare. Tonterias aparte, también se usa el service worker para cachear los recursos estáticos.

### Seguridad:
Aquí me voy a centrar en el ataque XSS, porque si, como tal es viable. Cualquier persona puede registrar un script malicioso como descripción, y técnicamente se va a ejecutar, pero aquí es donde voy a explicar de forma prágmatica porque, a pesar de ser una chapuza (porque si, lo admito, como tal es una chapuza y me podéis criticar por ello), no es algo de lo que preocuparse.

La app está pensada para usarse entre un circulo cerrado pequeño, quiero decir, yo la uso con mi familia (4 personas), y la seguridad hace que nadie pueda entrar aparte de nosotros, de forma que aquí el riesgo de ataque XSS es lo gracioso que yo me levante un día y quiera gastar una broma.

Por otra parte, vamos a decir que un ruso se cuela por que compartí la url y el usuario antes de meterlo (lo cual es más que un error parece que se ha hecho a posta, pero vamos a imaginarlo), y que ese ruso mete un script malicioso, ¿Qué puede robarme? 

* konta_device_token: Tu token único generado por crypto.subtle.
* konta_url_api: La URL exacta de tu Worker en Cloudflare (aunque técnicamente este ya lo tenía).
* konta_usuario: Tu nombre de usuario para el login.
* Presupuesto base o gastos.

Como vemos, estos datos no son sensibles (salvo que añadas tu tarjeta de credito en las descripciones de tus compras, claro esta), como mucho puede violar un poco tu privacidad, pero nadie en su sano juicio va a hacer ingienería social para meterse en tu base de datos de gastos semanales tales como "Carnicería" o "calzoncillos del bicho SIUUU".

Por otro lado, si existe un riesgo más "troll", y es destrozar la base de datos, pero por suerte cloudflare tiene una función llamada "Time travel" que permite restaurar la base de datos, por lo que esto tampoco es un riesgo como tal. Ahora, esto me excibe de culpa/responsabilidad/chapuza? Rotundamente no, esto es una chapuza que por puro pragmatismo no arreglo. Espero que me comprendáis, y que entendáis que en un proyecto que seguramente solo voy a usar yo y mi familia, no merece la pena 20 minutos más de desarrollo.


## Fin:
Y ya hemos llegado al fin del readme. Este ha sido de poca calidad para mis estandares, pero mi padre está ingresado y no tengo ni tiempo ni cuerpo para escribir algo mejor. Gracias por la comprensión, y un saludo.
