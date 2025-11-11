# Iapacte

**Inglés**: Para la versión en inglés de este README, consulta [`README.md`](../README.md).

Iapacte está construyendo el Sistema Operativo para gobiernos regionales: una plataforma compartida donde ayuntamientos, personal público y ciudadanía colaboran con herramientas modernas, asistentes de IA en tiempo real y datos gobernados. Todo lo que diseñamos se basa en lo que las administraciones nos han contado que les duele hoy: duplicación de trabajo, herramientas frágiles, datos desconectados y falta de una base común sobre la que construir.

## ¿Por qué Iapacte ahora?

- **Impacto público primero**: Más de 8.000 municipios en España gestionan miles de millones al año y aún dependen de hojas de cálculo, cadenas de correos y proveedores a medida. Les damos un espacio de trabajo cohesivo que controlan de verdad.
- **Conocimiento y procesos reutilizables**: Los ayuntamientos repiten los mismos procedimientos cada día. Empaquetamos buenas prácticas para compartirlas, adaptarlas y ejecutarlas con seguridad entre municipios.
- **Núcleo extensible**: Al tratar Iapacte como un OS “API-first”, cualquier departamento, proveedor o hacker cívico puede conectar flujos, datos y apps verticales sin empezar de cero.

## Pilares estratégicos

1. **Compartir y transferir conocimiento**  
   Los ayuntamientos reutilizan listas de verificación, plantillas, flujos y lecciones aprendidas de sus pares en lugar de rehacerlas desde cero. Un motor de descubrimiento integrado busca y recomienda experiencias y proyectos de otras organizaciones —artículos, blogs y casos de estudio— en el país y fuera, para aprender rápido y activar nuevas conexiones.  
   _Ejemplo: Cuando Manresa necesita un plan de respuesta a inundaciones, parte de la plantilla aprobada de Girona, cambia los contactos y publica el plan en minutos._

2. **Espacio de documentos tipo Dropbox**  
   Expedientes, carpetas de casos y archivos institucionales conviven en una biblioteca segura, con permisos correctos de serie y enlaces directos a workflows.  
   _Ejemplo: Cultura sube el último dossier de subvenciones a una carpeta compartida y la comisión intermunicipal lo abre sin perseguir adjuntos por email._

3. **Automatización de workflows**  
   Flujos visuales y reutilizables gestionan aprobaciones, validaciones y recordatorios para que las personas se centren en lo importante.  
   _Ejemplo: Una trabajadora social lanza un flujo de alta que pre-rellena formularios, envía firmas a Secretaría y avisa a Hacienda cuando hay que liberar fondos._

4. **Datos gobernados y accesibles**  
   Tablas tipo hoja de cálculo, familiares para el usuario, que conectan con fuentes internas y externas, registran cada cambio y están listas para la IA.  
   _Ejemplo: Movilidad combina sensores de tráfico con conteos manuales en una sola tabla que genera automáticamente el informe semanal para el pleno._

5. **Suite de aplicaciones específicas**  
   Apps verticales sobre el núcleo compartido: redactor de licitaciones, comparador de concursos, chats contextuales y herramientas para contratación, urbanismo, servicios sociales, etc.  
   _Ejemplo: Urbanismo usa la app de comparación de zonificación para revisar cómo municipios similares abordaron nuevas torres antes de emitir una recomendación._

6. **Base API-first**  
   Cada capacidad se expone vía APIs con permisos granulares de estilo ReBAC, para que departamentos, contratistas y socios cívicos extiendan la plataforma de forma segura.  
   _Ejemplo: Un consorcio regional conecta su portal ciudadano con los permisos de Iapacte y permite a contratistas subir avances sin crear más cuentas._

7. **IA como capa transversal**  
   La asistencia inteligente aparece en todos los módulos: redacta textos, detecta pasos que faltan y sugiere próximos movimientos respetando siempre la gobernanza.  
   _Ejemplo: Al redactar un informe de contratación, el asistente sugiere lenguaje conforme, enlaza documentos citados y avisa de anexos faltantes antes de presentar._

_Resumen: conocimiento compartido + documentos + automatización + datos gobernados + apps verticales + API-first + IA en todas partes._

## Primera ola de aplicaciones

### Suite de contratación pública con IA

Empezamos por contratación pública porque impacta a todos los departamentos y evidencia los vacíos anteriores.

- **Redactor de licitaciones**: Genera documentos conformes (pliegos, criterios de evaluación, informes de adjudicación) usando plantillas municipales de referencia y alineadas con la ley española.
- **Inteligencia comparativa**: Enseña licitaciones similares, referencias de precios y actividad de proveedores en portales nacionales y autonómicos (PLACSP y otros).
- **Workflows guiados**: Sugiere circuitos de aprobación, plazos y paquetes documentales para avanzar más rápido y con trazabilidad.

### Próximas experiencias verticales

- Chat contextual para personal y ciudadanía, basado en datos gobernados de la organización.
- Espacios colaborativos de conocimiento para borradores de políticas, subvenciones o programas compartidos entre municipios.
- Kits de automatización para urbanismo, servicios sociales y mantenimiento de infraestructuras.

## Arquitectura y stack tecnológico

- **Arquitectura Limpia + DDD** para desacoplar lo municipal, la infraestructura y la IA.
- **TypeScript en todo el stack** (Node ≥22, pnpm v9) con Effect 3 para concurrencia estructurada y LangChain/LangGraph para flujos de agentes.
- **Frontend**: React 19 + Vite 6 + TanStack Router (rutas por archivos) con tokens MD3 en Tailwind, componentes Base UI, animaciones con Motion.dev y stores con Effect Atom.
- **Backend**: Servicios Fastify, almacenamiento gobernado, Qdrant/PostgreSQL para búsqueda semántica y datos relacionales, y autenticación preparada para ReBAC.
- **DevX**: Nix Flake fija la toolchain, Turbo orquesta el monorepo, Biome aplica formato/lint y Paraglide gestiona la localización en los paquetes compartidos.

## Puesta en marcha

1. `nix develop` (o `direnv allow`) para entrar en la toolchain fijada.  
2. `pnpm install && pnpm prepare` para instalar dependencias y ganchos de Lefthook.  
3. Explora `apps/server`, `apps/web` y los paquetes en `packages/` para dominio, UI e infraestructura.  
4. Ejecuta `pnpm web` o `pnpm server` para desarrollo local, y `pnpm lint`, `pnpm check-types`, `pnpm build` antes de abrir un PR.  
5. Lee la [Guía de Contribución](../CONTRIBUTING.md) para estándares de código, límites DDD y expectativas de PR.

## Licencia

Licenciado bajo GNU Affero General Public License v3.0. Consulta [LICENSE](../LICENSE.md) para los detalles.
