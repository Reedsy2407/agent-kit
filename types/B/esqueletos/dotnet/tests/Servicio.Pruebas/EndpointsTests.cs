using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace Servicio.Pruebas;

public class EndpointsTests
{
    private static WebApplicationFactory<Program> Fabrica(string? entorno) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(b => b.ConfigureAppConfiguration((_, c) =>
        {
            if (entorno is not null) c.AddInMemoryCollection(new Dictionary<string, string?> { ["APP_ENTORNO"] = entorno });
        }));

    [Fact]
    public async Task Salud_responde_200_con_estado_ok()
    {
        using var fabrica = Fabrica("desarrollo");
        var r = await fabrica.CreateClient().GetAsync("/salud");
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        using var doc = JsonDocument.Parse(await r.Content.ReadAsStringAsync());
        Assert.Equal("ok", doc.RootElement.GetProperty("estado").GetString());
        Assert.Equal("nosniff", r.Headers.GetValues("X-Content-Type-Options").Single());
    }

    [Fact]
    public async Task Saludo_usa_el_nombre()
    {
        using var fabrica = Fabrica("desarrollo");
        var r = await fabrica.CreateClient().GetAsync("/api/saludo?nombre=Ana");
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        using var doc = JsonDocument.Parse(await r.Content.ReadAsStringAsync());
        Assert.Equal("Hola, Ana", doc.RootElement.GetProperty("mensaje").GetString());
    }

    [Theory]
    [InlineData("GET", "/api/saludo?nombre=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", 400)]
    [InlineData("GET", "/no-existe", 404)]
    [InlineData("POST", "/salud", 405)]
    public async Task Los_errores_usan_un_solo_formato(string metodo, string ruta, int estado)
    {
        using var fabrica = Fabrica("desarrollo");
        var r = await fabrica.CreateClient().SendAsync(new HttpRequestMessage(new HttpMethod(metodo), ruta));
        Assert.Equal(estado, (int)r.StatusCode);
        Assert.StartsWith("application/problem+json", r.Content.Headers.ContentType?.MediaType ?? "");
        using var doc = JsonDocument.Parse(await r.Content.ReadAsStringAsync());
        var claves = doc.RootElement.EnumerateObject().Select(x => x.Name).OrderBy(x => x).ToArray();
        Assert.Equal(new[] { "detail", "status", "title", "type" }, claves);
        Assert.Equal(estado, doc.RootElement.GetProperty("status").GetInt32());
    }

    [Fact]
    public void Sin_APP_ENTORNO_el_servicio_no_arranca()
    {
        using var fabrica = Fabrica(null);
        var e = Assert.ThrowsAny<Exception>(() => fabrica.CreateClient());
        Assert.Contains("APP_ENTORNO", e.ToString());
    }
}
