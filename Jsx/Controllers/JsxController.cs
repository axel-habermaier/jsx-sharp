using Microsoft.AspNetCore.Mvc;
using PPP;

namespace Jsx.Controllers;

[Route("api/[controller]")]
[ApiController]
public class JsxController : ControllerBase
{
    private const string Type = "text/html";
    //private const string Type = "text/plain";

    [HttpGet("other")]
    public IActionResult GetOther()
    {
        var writer = new JsxWriter();
        Example.Other(new(x: true, y: 1, z: null, a: new[] { 1, 2, 3 }))(writer);
        return Content(writer.ToString(), Type);
    }

    [HttpGet("test")]
    public IActionResult GetTest()
    {
        var writer = new JsxWriter();
        Example.Test(new(x: false, y: 1, z: null, a: new[] { 1, 2, 3 }))(writer);
        return Content(writer.ToString(), Type);
    }

    [HttpGet("user-avatar")]
    public IActionResult GetUserAvatar()
    {
        var writer = new JsxWriter();
        Example.UserAvatar(new(userId: Guid.NewGuid(), name: "Axel", image: "yay.gif", status: Example.Status.loggedIn, canBeNull: null,
                recursiveNull: Array.Empty<string>(),
                recursiveNullAll: null))
            ?.Invoke(writer);
        return Content(writer.ToString(), Type);
    }
}