# Como usar los workers sin morir en el intento
Creo que el titulo ha sido lo suficiente descriptivo, pero lo vuelvo a decir, vamos a explicar como configurar y usar los workers para humanos funcionales y no funcionales.

## Requisitos previos:
Vamos a necesitar dos cosas:
* Una cuenta de Cloudflare (100% gratis)
* Los archivos Worker-DB.js y Worker-API.js (que como estáis leyendo esto, los debéis tener a mano)

## Paso 1: Crear la base de datos D1:
Para que los workers funcionan necesitan un lugar donde modificar datos, y ese lugar es la base de datos D1. Crearla es muy sencilla:
1. Entrar al dashboard de cloudflare.
2. Vamos al menu lateral de la izquierda, abrimos "Almacenamiento y bases de datos" y le damos click a "Base de datos SQL D1". 
3. Creamos una base de dato con el nombre de "konta-db" (o el que queráis). Por si no véis el botón, parte superior derecha, un botón azul que pone "crear base de datos". Dificil eh?
4. Si os preguntan por la ubicación de los datos, ponéis "Ubicación", que por muy lioso que sea el nombre básicamente es modo automatico y fácil.
5. Disfruta, has completado el paso 1.

## Paso 2: Crear los workers
Ahora necesitamos los workers, voy a explicar como crear solo uno porque el procedimiento es igual para ambos:
1. Entrar al dashboard de cloudflare.
2. Vamos al menu lateral de la izquierda, abrimos "computo" y le damos click a "Workers y Pages".
3. Le damos a crear aplicación. Automaticamente debería llevar a crear un worker, pero por si acaso leerlo no vaya a ser que en un futuro pongan pages por defecto. 
4. Le damos a "Empiece con !Hola mundo¡".
5. Ponemos un nombre bonito. Yo recomiendo "konta-db" y "konta-api", aunque como podéis adivinar, podemos poner el que queráis. 
6. Una vez creado, nos vamos a Vinculaciones, y agregamos una vinculación de tipo "Base de datos SQL D1". Para el nombre de variable recomiendo poner "DB" (en mayúsculas) y para la base de datos seleccionamos la que hemos creado en el paso 1.
7. Ahora, pegamos el código correspondiente en cada worker. Para el worker "konta-db" pegamos el contenido de Worker-DB.js y para el worker "konta-api" pegamos el contenido de Worker-API.js. ¿Cómo se pega? Muy sencillo, en información general (la pantalla en la que apareces cuando le haces click), arriba a la derecha pone "Editar código". Copiamos el código correspondiente de nuestros archivos (recordar que el worker-DB lo váis a tener que editar para cumplir con vuestros requisitos), seleccionados todo el código que hay en el editor y pegamos el nuestro, borrando el anterior sin miedo.
8. Felicidades, ya tienes los dos workers creados y listos para usar. Has completado el paso 2.

### Paso 3:
Ya lo tenemos todo, así que hay que usar la app:
1. Entramos por primera vez en la web de Konta (A poder ser en el dispositivo que vayáis a usar todos los días porque si no vaís a tener que borrar el id manualmente para que funcione vuestro usuario en otro dispositivo).
2. Clickamos al texto debajo del botón para crear una base de datos.
3. Rellenamos los datos y si os hace falta, activáis el modo alto contraste.
4. Usais la app. Podéis compartir la url del worker desde el menu lateral para que nadie más se muera escribiendo esa url, y os recomiendo borrar el worker-DB, aunque no pasa nada si lo dejas vivo.

### Notas para normies (con respeto):
* ¿Qué es la URL?: Es el enlace que termina en `.workers.dev`.
* ¿Puedo borrar el Worker-DB después?: Sí, una vez la base de datos esté creada, ya no lo necesitas, pero no molesta si lo dejas ahí. Lo vuelvo a repetir por si tenéis miedo.
* ¿Si cambio de móvil?: Pídele a alguien que sepa un poco de SQL que te borre el `device_token` de la tabla `users` en el panel de Cloudflare -> D1 -> Console.
