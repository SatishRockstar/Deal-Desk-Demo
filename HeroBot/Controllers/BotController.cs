using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Azure.Communication.Chat;
using HeroBot.Models;
using HeroBot.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.CognitiveServices.Language.LUIS.Runtime;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Web;
using Microsoft.AspNetCore.Http;
using System.Text;
using AdaptiveCards.Templating;
using AdaptiveCards;
using AdaptiveCards.Rendering.Html;

// For more information on enabling MVC for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace HeroBot.Controllers
{
    [ApiController]
    // [Route("Bot")]
    public class BotController : Controller
    {
        // GET: /<controller>/
        //public IActionResult Index()
        //{
        //    return View();
        //}

        private readonly IBotServices _botServices;
        private readonly IWeatherServices _weatherServices;
        private readonly ILogger<BotController> _logger;
        private readonly IConfiguration _configuration;
        private readonly IDocumentService _documentService;
        private readonly IEmailService _emailService;
        private readonly Person[] _people;
        private readonly ICardService _cardService;
        public BotController(ILogger<BotController> logger, IBotServices botServices, IWeatherServices weatherServices, IConfiguration configuration, IDocumentService document, IEmailService emailService, ICardService cardService)
        {
            _logger = logger;
            _botServices = botServices;
            _weatherServices = weatherServices;
            _configuration = configuration;
            _documentService = document;
            _emailService = emailService;
            _people = configuration.GetSection("Persons").Get<Person[]>();
            _cardService = cardService;
        }

        [Route("processMessage")]
        [HttpPost]
        public async Task<IActionResult> ProcessMessage(ClientChatMessage message)
        {
            var weatherClient = _botServices.LuisWeatherRuntimeClient(_configuration);
            
            try
            {
                if (message.Content.Message.ToLower()=="hi"|| message.Content.Message.ToLower() == "hello")
                {
                    if (message.Content.Message.ToLower() == "hi")
                    {
                        return Ok($"Hello {message.SenderDisplayName}, How can I help you?");
                    }
                    else
                    {
                        return Ok($"Hi {message.SenderDisplayName}, How can I help you?");
                    }
                }
                else if (message.Content.Message.Contains("weather".ToLower()))
                {
                    var jsondata = await _cardService.ReadCardSectionAsync("weather");
                    var template = new AdaptiveCardTemplate(jsondata.template);
                    try
                    {
                        var ApplicationId = _configuration["LuisWeatherAppId"];
                        var result = await weatherClient.Prediction.ResolveAsync(ApplicationId, message.Content.Message);
                        var WeatherDetails = new JObject();
                        if (result.Entities.Count > 0)
                        {
                            WeatherDetails = await _weatherServices.GetCurrentWeather(result.Entities[0].Entity);
                            var weatherdata = _cardService.PrepareWeatherData(WeatherDetails);
                            string cardjson = template.Expand(weatherdata);
                            var card = AdaptiveCard.FromJson(cardjson);
                            AdaptiveCardRenderer renderer = new AdaptiveCardRenderer();
                            // Render the card
                            RenderedAdaptiveCard renderedCard = renderer.RenderCard(card.Card);
                            // Get the output HTML
                            HtmlTag html = renderedCard.Html;
                            return Ok($"{html}");
                            //return Ok($"Weather Details:\n\nLooks like {WeatherDetails.SelectToken("weather[0].description")}\n\nTemperature: {WeatherDetails.SelectToken("main.temp")}\n\nFeels like: {WeatherDetails.SelectToken("main.feels_like")}\n\nHumidity: {WeatherDetails.SelectToken("main.humidity")}");

                        }
                        // var json = JsonConvert.SerializeObject(result, Formatting.Indented);
                        return Ok();

                    }
                    catch (Exception)
                    {

                        throw;
                    }
                   
                }
                else
                {
                    var ApplicationId = _configuration["LuisDocumentAppId"];
                    var result = await weatherClient.Prediction.ResolveAsync(ApplicationId, message.Content.Message);
                    //var WeatherDetails = new JObject();
                    if (result.TopScoringIntent.Score>0.8)
                    {
                        switch (result.TopScoringIntent.Intent)
                        {
                            case "Users":
                                try
                                {
                                    var Department = result.Entities.Where(x => x.Type == "department").FirstOrDefault();
                                    var Person = _people.Where(p => p.Department == Department.Entity).FirstOrDefault();
                                    var Subject = "Request to join Icertis Deal Desk Chat";
                                    var Message = $"Hello {Person.Name}<br/> Please join the chat at following URL<br/><a href=\"{message.ChatUrl}\">{message.ChatUrl}</a>";
                                    await _emailService.Send(Person.Email, Message, Subject);
                                    return Ok($"A request has been sent to concerned person. They will be joining chat soon");
                                }
                                catch (Exception)
                                {
                                    return Ok($"Something is wrong contact admin");
                                }
                                
                            case "Retrieve":
                                var jsondata = await _cardService.ReadCardSectionAsync("documentList");
                                var template = new AdaptiveCardTemplate(jsondata.template);
                                JObject doclist = new JObject();
                                if (result.Entities.Count > 0)
                                {
                                    int length = result.Entities[2].EndIndex - result.Entities[2].StartIndex + 1;

                                    var type = message.Content.Message.Substring(result.Entities[2].StartIndex, length);
                                    doclist = await _documentService.GetContractList(type);
                                    //var docdata = _cardService.PrepareWeatherData(doclist);
                                    string cardjson = template.Expand(doclist);
                                    //var card = AdaptiveCard.FromJson(cardjson);
                                    //AdaptiveCardRenderer renderer = new AdaptiveCardRenderer();
                                    //// Render the card
                                    //RenderedAdaptiveCard renderedCard = renderer.RenderCard(card.Card);
                                    //// Get the output HTML
                                    //HtmlTag html = renderedCard.Html;

                                    return Ok($"{cardjson}");

                                }
                                break;
                            default:
                                return Ok();
                                break;
                        }
                    }
                }
                
                // var json = JsonConvert.SerializeObject(result, Formatting.Indented);
                return Ok();
            }
            catch (Exception ex)
            {
                Console.WriteLine("\nSomething went wrong. Please Make sure your app is published and try again.\n");
                return BadRequest();
            }

        }
    }
}
