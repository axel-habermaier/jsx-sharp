using JsxSharp.JsxRuntime3;
using PPP;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddResponseCompression(options => options.EnableForHttps = true);
var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseResponseCompression();
app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();
app.UseEndpoints(endpoints => endpoints.MapControllers());

Example3Module.AboutPage(app);

//QuestionnaireEditorModule.QuestionnaireEditor(app);
DirectJsx.QuestionnaireEditor(app);
app.MapGet("/htmlSharp", () => Results.Content(JsxSharp.Csx4.Controller.Get(3), "text/html"));

app.Run();
