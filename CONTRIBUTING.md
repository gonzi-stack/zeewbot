# Guía de Contribución - ZeewBot 🚀

¡Gracias por tu interés en contribuir a ZeewBot! Esta guía te ayudará a entender cómo puedes aportar al proyecto.

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [¿Cómo puedo contribuir?](#cómo-puedo-contribuir)
- [Proceso de Desarrollo](#proceso-de-desarrollo)
- [Guía de Estilo](#guía-de-estilo)
- [Configuración del Entorno](#configuración-del-entorno)
- [Pull Requests](#pull-requests)

## 🤝 Código de Conducta

Este proyecto sigue el código de conducta de Zeew Space. Al participar, se espera que:

- Uses un lenguaje acogedor e inclusivo
- Respetes los diferentes puntos de vista y experiencias
- Aceptes las críticas constructivas con gracia
- Te enfoques en lo mejor para la comunidad
- Muestres empatía hacia otros miembros de la comunidad

## 🎯 ¿Cómo puedo contribuir?

### Reportando Bugs

Los bugs se rastrean como [GitHub issues](https://github.com/zeewspace/zeewbot/issues). Antes de crear un reporte:

1. **Verifica** si el bug ya ha sido reportado
2. **Asegúrate** de estar usando la última versión
3. **Recopila** información sobre el bug:
   - Pasos para reproducir
   - Comportamiento esperado vs actual
   - Screenshots si aplica
   - Tu entorno (OS, versión de Node, etc.)

### Sugiriendo Mejoras

Las sugerencias de mejoras también se manejan como issues. Cuando crees una sugerencia:

1. **Usa un título claro y descriptivo**
2. **Proporciona una descripción detallada** de la mejora sugerida
3. **Explica por qué** esta mejora sería útil
4. **Lista ejemplos** de cómo se usaría

### Tu Primera Contribución

¿No sabes por dónde empezar? Busca issues etiquetados como:

- `good first issue` - Buenos para principiantes
- `help wanted` - Necesitan atención extra
- `documentation` - Mejoras en documentación

## 🔧 Proceso de Desarrollo

1. **Fork** el repositorio
2. **Clona** tu fork:
   ```bash
   git clone https://github.com/tu-usuario/zeewbot.git
   cd zeewbot
   ```

3. **Crea una rama** para tu feature:
   ```bash
   git checkout -b feature/mi-nueva-caracteristica
   ```

4. **Configura el entorno**:
   ```bash
   pnpm install
   cp .env.example .env
   # Configura tu .env con un token de prueba
   ```

5. **Desarrolla** tu feature con tests si es posible

6. **Verifica** tu código:
   ```bash
   pnpm run lint
   pnpm run build
   ```

7. **Commit** tus cambios:
   ```bash
   git commit -m "feat: agrega nueva característica X"
   ```

## 📝 Guía de Estilo

### Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/). Formato:

```
<tipo>(<alcance>): <descripción corta>

<descripción larga opcional>

<footer opcional>
```

Tipos comunes:
- `feat`: Nueva característica
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios de formato (no afectan funcionalidad)
- `refactor`: Refactorización de código
- `test`: Agregar o corregir tests
- `chore`: Cambios en el proceso de build o herramientas

### Código TypeScript

- **Indentación**: 2 espacios
- **Punto y coma**: Siempre
- **Comillas**: Simples para strings
- **Nombres**:
  - `camelCase` para variables y funciones
  - `PascalCase` para clases e interfaces
  - `UPPER_SNAKE_CASE` para constantes

### Estructura de Archivos

```typescript
// 1. Imports de módulos externos
import { Client } from 'discord.js';

// 2. Imports de módulos locales
import { IBot } from '../interfaces/IBot';

// 3. Declaraciones de tipos/interfaces
interface MyInterface {
  // ...
}

// 4. Implementación
export class MyClass {
  // ...
}
```

### Documentación

- Documenta todas las funciones públicas
- Usa JSDoc para documentación:

```typescript
/**
 * Crea un nuevo ticket de soporte
 * @param member - El miembro que solicita el ticket
 * @param reason - Razón opcional para el ticket
 * @returns El canal del ticket creado o null si falla
 */
public async createTicket(member: GuildMember, reason?: string): Promise<TextChannel | null> {
  // ...
}
```

## 🚀 Pull Requests

1. **Asegúrate** de que tu código sigue la guía de estilo
2. **Actualiza** la documentación si es necesario
3. **Agrega tests** si es posible
4. **Completa** la plantilla de PR
5. **Vincula** el issue relacionado si existe

### Proceso de Revisión

1. Un maintainer revisará tu PR
2. Pueden solicitar cambios o mejoras
3. Una vez aprobado, será mergeado

### Checklist para PR

- [ ] Mi código sigue el estilo del proyecto
- [ ] He ejecutado `pnpm run lint` sin errores
- [ ] He agregado tests que prueban mi fix/feature
- [ ] Todos los tests pasan (`pnpm test`)
- [ ] He actualizado la documentación
- [ ] Mi código genera 0 warnings
- [ ] He agregado comentarios en áreas complejas

## 🧪 Testing

Aunque actualmente no hay tests implementados, animamos a:

1. Agregar tests para nuevas features
2. Crear tests para bugs corregidos
3. Mejorar la cobertura de tests existente

### Ejecutar Tests

```bash
pnpm test          # Ejecutar todos los tests
pnpm run test:watch # Ejecutar tests en modo watch
```

## 🌟 Reconocimiento

Todos los contribuidores serán agregados a la lista de contribuidores en el README.

## ❓ ¿Preguntas?

Si tienes dudas:

1. Revisa la [documentación](../README.md)
2. Busca en los [issues existentes](https://github.com/zeewspace/zeewbot/issues)
3. Únete a nuestro [Discord](https://discord.gg/zeewspace)
4. Crea un nuevo issue con la etiqueta `question`

---

¡Gracias por contribuir a ZeewBot! 🎉
