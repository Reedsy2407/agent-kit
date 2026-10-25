using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

// Configuración: APP_ENTORNO es obligatoria. Si falta o no es válida, el servicio NO arranca (ValidateOnStart) y el mensaje
// no muestra valores. PORT y HOST son opcionales. Los secretos, cuando existan, no llevan valor por defecto.
builder.Services.AddOptions<Ajustes>()
    .Configure<IConfiguration>((o, c) => o.Entorno = c["APP_ENTORNO"])
    .Validate(o => !string.IsNullOrEmpty(o.Entorno), "falta APP_ENTORNO (obligatoria: desarrollo o produccion)")
    .Validate(o => string.IsNullOrEmpty(o.Entorno) || o.Entorno is "desarrollo" or "produccion", "APP_ENTORNO debe ser desarrollo o produccion")
    .ValidateOnStart();

var puertoTexto = builder.Configuration["PORT"];
var puerto = 8080;
if (!string.IsNullOrEmpty(puertoTexto) && !(int.TryParse(puertoTexto, out puerto) && puerto is >= 1 and <= 65535))
{
    Console.Error.WriteLine("Configuración inválida: PORT debe ser un entero de 1 a 65535");
    return 1;
}

var host = builder.Configuration["HOST"] is { Length: > 0 } h ? h : "127.0.0.1";
builder.WebHost.UseUrls($"http://{host}:{puerto}");
builder.Services.Configure<HostOptions>(o => o.ShutdownTimeout = TimeSpan.FromSeconds(10));

// Formato uniforme de error: problema HTTP (RFC 9457), siempre con el mismo contenido y sin detalles internos.
builder.Services.AddProblemDetails(o => o.CustomizeProblemDetails = ctx =>
{
    var estado = ctx.ProblemDetails.Status ?? 500;
    ctx.ProblemDetails.Type = "about:blank";
    ctx.ProblemDetails.Title = estado switch { 400 => "Petición inválida", 404 => "No encontrado", 405 => "Método no permitido", _ => "Error interno" };
    ctx.ProblemDetails.Detail = estado switch { 400 => "La petición no es válida.", 404 => "No existe esa ruta.", 405 => "Método no permitido.", _ => "Ocurrió un error inesperado." };
    ctx.ProblemDetails.Extensions.Clear();
});

var app = builder.Build();

app.Use((contexto, siguiente) =>
{
    contexto.Response.OnStarting(() =>
    {
        contexto.Response.Headers["X-Content-Type-Options"] = "nosniff";
        contexto.Response.Headers["Cache-Control"] = "no-store";
        return Task.CompletedTask;
    });
    return siguiente();
});
app.UseExceptionHandler();
app.UseStatusCodePages();

// Sin base de datos ni clientes salientes (si los hay, cada cliente lleva tres tiempos: conexión, lectura y total).
app.MapGet("/salud", (IOptions<Ajustes> ajustes) => Results.Ok(new { estado = "ok", entorno = ajustes.Value.Entorno }));

app.MapGet("/api/saludo", (string? nombre) =>
{
    nombre ??= "mundo";
    if (string.IsNullOrWhiteSpace(nombre) || nombre.Length > 50 || nombre.Any(char.IsControl)) return Results.StatusCode(400);
    return Results.Ok(new { mensaje = $"Hola, {nombre}" });
});

try
{
    app.Run();
}
catch (OptionsValidationException e)
{
    // Configuración inválida: mensaje claro (sin valores) y salida 1, en vez de un volcado de la excepción.
    Console.Error.WriteLine($"Configuración inválida: {string.Join("; ", e.Failures)}");
    return 1;
}

return 0;

public sealed class Ajustes
{
    public string? Entorno { get; set; }
}

// Necesario para que las pruebas (WebApplicationFactory) vean el punto de entrada.
public partial class Program;
