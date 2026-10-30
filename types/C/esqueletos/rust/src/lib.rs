//! Herramienta de ejemplo (CLI y daemon) solo con la biblioteca estándar. El comportamiento está en
//! `kit/CONTRATO-ESQUELETOS.md`.

pub mod cli;
pub mod config;
pub mod demonio;
pub mod entrada;
pub mod json;
pub mod registro;
#[allow(unsafe_code)]
// única excepción: señales del sistema sin dependencias (ver el encabezado del módulo)
pub mod senal;
