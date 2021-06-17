using System;
using Microsoft.Azure.CognitiveServices.Language.LUIS.Runtime;
using Microsoft.Bot.Builder.AI.Luis;
using Microsoft.Bot.Builder.AI.Orchestrator;
using Microsoft.Bot.Builder.AI.QnA;
using Microsoft.Extensions.Configuration;

namespace HeroBot.Services
{
    public interface IBotServices
    {
        LuisRecognizer LuisHomeAutomationRecognizer { get; }

        LuisRecognizer LuisWeatherRecognizer { get; }

        OrchestratorRecognizer Dispatch { get; }

        LUISRuntimeClient LuisWeatherRuntimeClient(IConfiguration configuration);

        QnAMaker SampleQnA { get; }
    }
}
