using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Security.Cryptography.X509Certificates;
using System.Threading.Tasks;

namespace HeroBot.Certificates
{
    public class Certificate
    {
        public static X509Certificate2 Get()
        {
            var assembly = typeof(Certificate).GetTypeInfo().Assembly;
            var names = assembly.GetManifestResourceNames();
            using (var stream = assembly.GetManifestResourceStream("HeroBot.Certificates.BapiClientCert.pfx"))
            {
                return new X509Certificate2(ReadStream(stream), "d3XtKQtJmn3Vb8/0bNmdaLuVs8mw3H95MzkOQNe3DVA=");
            }
        }
        private static byte[] ReadStream(Stream input)
        {
            byte[] buffer = new byte[16 * 1024];
            using (MemoryStream ms = new MemoryStream())
            {
                int read;
                while ((read = input.Read(buffer, 0, buffer.Length)) > 0)
                {
                    ms.Write(buffer, 0, read);
                }
                return ms.ToArray();
            }
        }
    }
}
