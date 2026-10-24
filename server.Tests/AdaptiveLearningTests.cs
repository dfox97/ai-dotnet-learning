using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

[assembly: CollectionBehavior(DisableTestParallelization = true)]

public class AdaptiveLearningTests {
    readonly JsonSerializerOptions json = new(JsonSerializerDefaults.Web);
    static readonly DateTimeOffset Now = DateTimeOffset.Parse("2026-10-23T12:00:00Z");
    static Attempt Evidence(string concept, int? score, int days = 0, string? questionId = null) => new(Guid.NewGuid().ToString(), questionId ?? concept, "Learner reasoning", score, "Mistake: confusing mutation and reassignment", "ai", Now.AddDays(-days), concept);

    [Fact] public void Weak_concepts_receive_more_slots_and_consistent_passes_increase_difficulty() {
        var attempts = Curriculum.Questions.SelectMany(q => new[] { Evidence(q.Id, q.Id == "parameter" ? 20 : 90, 1), Evidence(q.Id, q.Id == "parameter" ? 40 : 100) }).ToArray();
        var plan = AdaptiveLearning.Plan(attempts, Now);
        Assert.Equal(2, plan.Count(p => p.ConceptId == "parameter"));
        Assert.All(plan.Where(p => p.ConceptId == "parameter"), p => Assert.Equal("foundation", p.Difficulty));
        Assert.All(plan.Where(p => p.ConceptId != "parameter"), p => Assert.Equal("challenging", p.Difficulty));
        Assert.Equal(new[] { "multiple-choice", "prediction", "bug", "explanation" }, plan.Select(p => p.Kind));
    }

    [Fact] public void Fresh_variants_update_the_same_concept_and_unscored_reflections_are_not_passes() {
        var attempts = Curriculum.Questions.Select(q => Evidence(q.Id, 90)).Append(Evidence("copy", 10, questionId: "generated-variant"))
            .Append(Evidence("explain", null)).ToArray();
        var plan = AdaptiveLearning.Plan(attempts, Now);
        Assert.Contains(plan, p => p.ConceptId == "copy" && p.Difficulty == "foundation");
        Assert.Contains(plan, p => p.ConceptId == "explain" && p.Difficulty == "foundation");
        var prompt = AdaptiveLearning.Prompt(plan, attempts, Curriculum.Questions, json);
        Assert.Contains("Mistake: confusing mutation", prompt);
        Assert.Contains("Learner reasoning", prompt);
    }

    GeneratedBatch Batch(LearningTarget[] plan, string prefix = "Fresh") => new("Revisit pass-by-value mistakes before harder transfer.", plan.Select((p, i) => new GeneratedQuestion(
        p.ConceptId, p.Kind, p.Difficulty, $"{prefix} scenario {i}: distinguish the copied value", "var x = 1;", p.Kind == "explanation" ? [] : ["One", "Two", "Three"], p.Kind == "explanation" ? "" : "One",
        "The value is copied; references still share their object.", "Track the variable and object separately.", "Compare a Node function parameter.", ["Explain what is copied.", "Distinguish mutation and reassignment."])).ToArray());

    [Fact] public void Validation_rejects_wrong_keys_duplicates_and_unplanned_targets() {
        var plan = AdaptiveLearning.Plan([], Now);
        var batch = Batch(plan);
        var session = AdaptiveLearning.Validate(JsonSerializer.Serialize(batch, json), plan, Curriculum.Questions, json);
        Assert.Equal(4, session.Questions.Length);
        Assert.All(session.Questions, q => Assert.StartsWith("generated-", q.Id));
        Assert.Throws<JsonException>(() => AdaptiveLearning.Validate(JsonSerializer.Serialize(batch, json), plan, session.Questions, json));
        var broken = batch with { Questions = batch.Questions.Select((q, i) => i == 0 ? q with { Answer = "not an option" } : q).ToArray() };
        Assert.Throws<JsonException>(() => AdaptiveLearning.Validate(JsonSerializer.Serialize(broken, json), plan, [], json));
        broken = batch with { Questions = batch.Questions.Select((q, i) => i == 0 ? q with { ConceptId = "unrelated" } : q).ToArray() };
        Assert.Throws<JsonException>(() => AdaptiveLearning.Validate(JsonSerializer.Serialize(broken, json), plan, [], json));
    }

    [Fact] public async Task Fireworks_uses_the_requested_default_model() {
        var names = new[] { "LAB_AI_KEY", "FIREWORKS_API_KEY", "LAB_AI_MODEL", "LAB_AI_ENDPOINT", "LAB_PROGRESS_DIR" };
        var old = names.ToDictionary(n => n, Environment.GetEnvironmentVariable);
        var directory = Path.Combine(Path.GetTempPath(), "lab-model-" + Guid.NewGuid().ToString("N"));
        foreach (var name in names) Environment.SetEnvironmentVariable(name, null);
        Environment.SetEnvironmentVariable("FIREWORKS_API_KEY", "test-placeholder");
        Environment.SetEnvironmentVariable("LAB_PROGRESS_DIR", directory);
        try {
            var provider = new FakeProvider();
            provider.Replies.Enqueue("{\"score\":60,\"feedback\":\"Clarify reassignment.\"}");
            using var factory = new LabFactory(provider);
            var response = await factory.CreateClient().PostAsJsonAsync("/api/lab/grade", new { questionId = "explain", answer = "My explanation." });
            response.EnsureSuccessStatusCode();
            Assert.Equal("api.fireworks.ai", provider.Destinations.Single().Host);
            using var doc = JsonDocument.Parse(provider.Requests.Single());
            Assert.Equal("accounts/fireworks/models/deepseek-v4p1-flash-1017", doc.RootElement.GetProperty("model").GetString());
        } finally {
            foreach (var name in names) Environment.SetEnvironmentVariable(name, old[name]);
            if (Directory.Exists(directory)) Directory.Delete(directory, true);
        }
    }

    [Fact] public void Track_exposes_eight_modules_with_verified_content_and_docs() {
        Assert.Equal(8, Curriculum.Modules.Length);
        Assert.Equal(8, Curriculum.Modules.Select(m => m.Id).Distinct().Count());
        foreach (var module in Curriculum.Modules) {
            Assert.False(string.IsNullOrWhiteSpace(module.Title));
            Assert.False(string.IsNullOrWhiteSpace(module.Summary));
            Assert.False(string.IsNullOrWhiteSpace(module.Outcome));
            Assert.False(string.IsNullOrWhiteSpace(module.TsComparison));
            Assert.Contains("CLR via C#, 4th Edition", module.BookReference);
            Assert.StartsWith("https://www.oreilly.com/library/view/clr-via-c/", Curriculum.BookUrl(module.Id));
            Assert.NotEmpty(module.Docs);
            Assert.All(module.Docs, doc => Assert.StartsWith("https://learn.microsoft.com/", doc.Url));
            Assert.All(module.Sections, section => Assert.False(string.IsNullOrWhiteSpace(section.Code)));
            Assert.True(module.Minutes is >= 15 and <= 30);
            Assert.True(module.Sections.Sum( s => s.Minutes) >= 15);
            Assert.False(string.IsNullOrWhiteSpace(module.AppliesToday));
            Assert.False(string.IsNullOrWhiteSpace(module.Historical));
            Assert.False(string.IsNullOrWhiteSpace(module.Checkpoint));
            Assert.Contains(module.Questions, q => q.Kind == "prediction");
            Assert.Contains(module.Questions, q => q.Kind == "bug");
            Assert.Contains(module.Questions, q => q.Kind == "explanation");
            Assert.Contains(module.Questions, q => q.Kind == "multiple-choice");
            Assert.Equal(module.Questions.Length, module.Questions.Select(q => q.Id).Distinct().Count());
            Assert.All(module.Questions, q => Assert.False(string.IsNullOrWhiteSpace(q.Explanation)));
        }
        Assert.Contains(Curriculum.Modules, m => m.Id == "value-types" && m.Questions.Any(q => q.Id == "boxing"));
    }

    [Fact] public void Plan_stays_at_four_targets_for_modules_with_more_than_four_concepts() {
        var module = Curriculum.Find("value-types");
        Assert.True(module.Questions.Length > 4);
        var plan = AdaptiveLearning.Plan(module.Questions, [], Now);
        Assert.Equal(4, plan.Length);
        Assert.All(plan, target => Assert.Contains(module.Questions, q => q.Id == target.ConceptId));
        Assert.Equal(new[] { "multiple-choice", "prediction", "bug", "explanation" }, plan.Select(p => p.Kind));
    }

    [Fact] public async Task Api_generates_grades_resumes_after_restart_and_uses_new_evidence_for_next_batch() {
        var directory = Path.Combine(Path.GetTempPath(), "lab-test-" + Guid.NewGuid().ToString("N"));
        var oldDirectory = Environment.GetEnvironmentVariable("LAB_PROGRESS_DIR");
        var oldKey = Environment.GetEnvironmentVariable("LAB_AI_KEY");
        Environment.SetEnvironmentVariable("LAB_PROGRESS_DIR", directory);
        Environment.SetEnvironmentVariable("LAB_AI_KEY", "test-placeholder");
        try {
            var provider = new FakeProvider();
            string sessionId;
            Question[] generated;
            var module = Curriculum.Modules[0];
            using (var factory = new LabFactory(provider)) {
                var client = factory.CreateClient();
                Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/lab/sessions", new { })).StatusCode);
                foreach (var q in module.Questions) {
                    if (q.Kind == "explanation") provider.Replies.Enqueue("{\"score\":70,\"feedback\":\"Explain parameter reassignment more carefully.\"}");
                    var graded = await client.PostAsJsonAsync("/api/lab/grade", new { questionId = q.Id, answer = q.Kind == "explanation" ? "The same reference is copied." : q.Answer });
                    Assert.Equal(HttpStatusCode.OK, graded.StatusCode);
                }
                var progress = (await client.GetFromJsonAsync<Attempt[]>("/api/lab/progress"))!;
                var plan = AdaptiveLearning.Plan(module.Questions, progress, DateTimeOffset.UtcNow);
                var batch = Batch(plan);
                provider.Replies.Enqueue(JsonSerializer.Serialize(batch, json));
                var response = await client.PostAsJsonAsync("/api/lab/sessions", new { });
                response.EnsureSuccessStatusCode();
                using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
                sessionId = doc.RootElement.GetProperty("id").GetString()!;
                Assert.False(doc.RootElement.GetProperty("questions")[0].TryGetProperty("answer", out _));
                Assert.False(doc.RootElement.GetProperty("questions")[0].TryGetProperty("explanation", out _));
                Assert.Equal(JsonValueKind.Null, doc.RootElement.GetProperty("questions")[3].GetProperty("practiceReference").ValueKind);
                generated = new AdaptiveCatalog(directory, json).Latest()!.Questions;
                Assert.Contains("Explain parameter reassignment", provider.Requests.Last());
                var calls = provider.Requests.Count;
                await client.PostAsJsonAsync("/api/lab/sessions", new { });
                Assert.Equal(calls, provider.Requests.Count); // existing unfinished session is reused
            }
            using (var factory = new LabFactory(provider)) {
                var client = factory.CreateClient();
                using var doc = JsonDocument.Parse(await client.GetStringAsync("/api/lab"));
                Assert.Equal(sessionId, doc.RootElement.GetProperty("adaptiveSession").GetProperty("id").GetString());
                foreach (var q in generated) {
                    if (q.Kind == "explanation") provider.Replies.Enqueue("{\"score\":25,\"feedback\":\"Still confuses reference reassignment.\"}");
                    var response = await client.PostAsJsonAsync("/api/lab/grade", new { questionId = q.Id, answer = q.Kind == "explanation" ? "A new explanation." : q.Answer });
                    var attempt = await response.Content.ReadFromJsonAsync<Attempt>();
                    Assert.Equal(q.ConceptId, attempt!.ConceptId);
                }
                var progress = (await client.GetFromJsonAsync<Attempt[]>("/api/lab/progress"))!;
                var plan = AdaptiveLearning.Plan(module.Questions, progress, DateTimeOffset.UtcNow);
                // An invalid generation must not damage saved questions or progress.
                provider.Replies.Enqueue("{\"questions\":[]}");
                Assert.Equal(HttpStatusCode.ServiceUnavailable, (await client.PostAsJsonAsync("/api/lab/sessions", new { })).StatusCode);
                Assert.Single(new AdaptiveCatalog(directory, json).Read());
                provider.Replies.Enqueue(JsonSerializer.Serialize(Batch(plan, "Second unseen"), json));
                var next = await client.PostAsJsonAsync("/api/lab/sessions", new { });
                next.EnsureSuccessStatusCode();
                Assert.Contains("Still confuses reference reassignment", provider.Requests.Last());
                Assert.Equal(2, new AdaptiveCatalog(directory, json).Read().Length);
                Assert.Contains("generated-", await client.GetStringAsync("/api/lab/progress.md"));
                Assert.Equal(module.Questions.Length + 4, (await client.GetFromJsonAsync<Attempt[]>("/api/lab/progress"))!.Length);
            }
        } finally {
            Environment.SetEnvironmentVariable("LAB_PROGRESS_DIR", oldDirectory);
            Environment.SetEnvironmentVariable("LAB_AI_KEY", oldKey);
            if (Directory.Exists(directory)) Directory.Delete(directory, true);
        }
    }
}

sealed class LabFactory(FakeProvider provider) : WebApplicationFactory<Program> {
    protected override void ConfigureWebHost(IWebHostBuilder builder) {
        builder.UseContentRoot(Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../server")));
        builder.ConfigureServices(services => services.AddSingleton<IHttpClientFactory>(provider));
    }
}
sealed class FakeProvider : HttpMessageHandler, IHttpClientFactory {
    public readonly Queue<string> Replies = new();
    public readonly List<string> Requests = [];
    public readonly List<Uri> Destinations = [];
    public HttpClient CreateClient(string name) => new(this, false);
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) {
        Destinations.Add(request.RequestUri!);
        Requests.Add(await request.Content!.ReadAsStringAsync(ct));
        var reply = Replies.Dequeue();
        return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(JsonSerializer.Serialize(new { choices = new[] { new { message = new { content = reply } } } }), Encoding.UTF8, "application/json") };
    }
}
