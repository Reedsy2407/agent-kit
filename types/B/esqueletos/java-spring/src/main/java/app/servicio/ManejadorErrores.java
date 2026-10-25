package app.servicio;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Formato uniforme de error: problema HTTP (RFC 9457, application/problem+json). Las excepciones propias de Spring MVC
 * (404, 405, parámetros inválidos...) las convierte la clase base; aquí se añaden el 400 propio y el 500 sin detalles internos.
 */
@RestControllerAdvice
public class ManejadorErrores extends ResponseEntityExceptionHandler {

    @ExceptionHandler(Endpoints.NombreInvalido.class)
    ProblemDetail peticionInvalida(Endpoints.NombreInvalido e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail inesperado(Exception e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "Ocurrió un error inesperado.");
    }
}
