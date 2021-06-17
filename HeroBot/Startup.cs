using System;
using System.IO;
using HeroBot.Bots;
using HeroBot.DataStorage;
using HeroBot.Models;
using HeroBot.Services;
using HeroBot.TokenManagement;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SpaServices.ReactDevelopmentServer;
using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.AI.Orchestrator;
using Microsoft.Bot.Builder.Integration.AspNet.Core;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
namespace HeroBot
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
            OrchestratorConfig = configuration.GetSection("Orchestrator").Get<OrchestratorConfig>();
        }
        
        public IConfiguration Configuration { get; }
        public OrchestratorConfig OrchestratorConfig { get; }
        public Person[] PersonConfig { get; }


        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddSingleton<IUserTokenManager, UserTokenManager>();
            services.AddSingleton<IChatAdminThreadStore, InMemoryChatAdminThreadStore>();

            // Create the Bot Framework Adapter with error handling enabled.
            services.AddSingleton<IBotFrameworkHttpAdapter, AdapterWithErrorHandler>();

            services.AddSingleton<OrchestratorRecognizer>(InitializeOrchestrator());

            // Create the bot services (LUIS, QnA) as a singleton.
            services.AddSingleton<IBotServices, BotServices>();
            services.AddSingleton<IWeatherServices, WeatherServices>();

            services.AddSingleton<IDocumentService, DocumentService>();
            services.AddSingleton<IEmailService, EmailService>();
            services.AddSingleton<ICardService, CardService>();
            // Create the bot as a transient.
            services.AddTransient<IBot, DispatchBot>();

            services.AddControllers();
            //services.AddAntiforgery(o => o.SuppressXFrameOptionsHeader = true);

            // In production, the React files will be served from this directory
            services.AddSpaStaticFiles(configuration =>
            {
                configuration.RootPath = "ClientApp/build";
            });
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseExceptionHandler("/Error");
                // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
                app.UseHsts();
            }

            // app.UseHttpsRedirection();
            app.UseStaticFiles();
            app.UseSpaStaticFiles();

            app.UseRouting();

            // This sample app serves a Single Page Application that is not intended to be embedded into
            // another site.
            // If you want to instead build a widget off of this sample that is embedded in your own application,
            // remove the following middleware.
            app.Use(async (context, next) =>
            {
                context.Response.Headers.Add("X-Frame-Options", "AllowAll");
                await next.Invoke();

            });

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });

            app.UseSpa(spa =>
            {
                spa.Options.SourcePath = "ClientApp";
                spa.Options.StartupTimeout = TimeSpan.FromSeconds(180);

                if (env.IsDevelopment())
                {
                    spa.UseReactDevelopmentServer(npmScript: "start --max_old_space_size=4096");
                }
            });
        }

        private OrchestratorRecognizer InitializeOrchestrator()
        {
            string modelFolder = Path.GetFullPath(OrchestratorConfig.ModelFolder);
            string snapshotFile = Path.GetFullPath(OrchestratorConfig.SnapshotFile);
            OrchestratorRecognizer orc = new OrchestratorRecognizer()
            {
                ModelFolder = modelFolder,
                SnapshotFile = snapshotFile
            };
            return orc;
        }
    }
}
