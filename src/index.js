const core = require("@actions/core");
const github = require("@actions/github");
const npa = require("npm-package-arg");
const installPreset = require("./installPreset");
const validateTitle = require("./validateTitle");
const axios = require("axios");
const fs = require("fs");

async function validateSubscription() {
  let repoPrivate;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath && fs.existsSync(eventPath)) {
    const payload = JSON.parse(fs.readFileSync(eventPath, "utf8"));
    repoPrivate = payload?.repository?.private;
  }

  const upstream = "aslafy-z/conventional-pr-title-action";
  const action = process.env.GITHUB_ACTION_REPOSITORY;
  const docsUrl =
    "https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions";

  core.info("");
  core.info("\u001b[1;36mStepSecurity Maintained Action\u001b[0m");
  core.info(`Secure drop-in replacement for ${upstream}`);
  if (repoPrivate === false)
    core.info("\u001b[32m✓ Free for public repositories\u001b[0m");
  core.info(`\u001b[36mLearn more:\u001b[0m ${docsUrl}`);
  core.info("");

  if (repoPrivate === false) return;
  const serverUrl = process.env.GITHUB_SERVER_URL || "https://github.com";
  const body = { action: action || "" };

  if (serverUrl !== "https://github.com") body.ghes_server = serverUrl;
  try {
    await axios.post(
      `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/maintained-actions-subscription`,
      body,
      { timeout: 3000 },
    );
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      core.error(
        `\u001b[1;31mThis action requires a StepSecurity subscription for private repositories.\u001b[0m`,
      );
      core.error(
        `\u001b[31mLearn how to enable a subscription: ${docsUrl}\u001b[0m`,
      );
      process.exit(1);
    }
    core.info("Timeout or API not reachable. Continuing to next step.");
  }
}

async function run() {
  await validateSubscription();

  try {
    let contextName = core.getInput("context-name");
    let successState = core.getInput("success-state");
    let failureState = core.getInput("failure-state");
    let targetUrl = core.getInput("target-url");
    const installPresetPackage = core.getInput("preset");
    const requirePresetPackage = npa(installPresetPackage).name;

    const client = new github.getOctokit(process.env.GITHUB_TOKEN);

    const contextPullRequest = github.context.payload.pull_request;
    if (!contextPullRequest) {
      throw new Error(
        "This action can only be invoked in `pull_request` events. Otherwise the pull request can't be inferred."
      );
    }

    const owner = contextPullRequest.base.user.login;
    const repo = contextPullRequest.base.repo.name;

    let error = null;
    try {
      await installPreset(installPresetPackage);
      await validateTitle(requirePresetPackage, contextPullRequest.title);
    } catch (err) {
      error = err;
    }

    core.setOutput("success", (error === null).toString());

    let state = "success";
    let description = successState;
    if (error) {
      state = "failure";
      description = failureState;
    }

    await client.request("POST /repos/:owner/:repo/statuses/:sha", {
      owner,
      repo,
      state,
      description,
      sha: contextPullRequest.head.sha,
      target_url: targetUrl,
      context: contextName,
    });

    if (error) {
      throw error;
    } else {
      console.log(`${state}: ${description}`);
    }
  } catch (error) {
    core.setOutput("error", error.message);
    core.setFailed(error.message);
  }
}

run().catch(console.error);
