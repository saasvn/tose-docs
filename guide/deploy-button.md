# Deploy on TOSE button

Add a **Deploy on TOSE** button to a README or a website. A visitor who clicks it lands on TOSE and deploys your GitHub repository, or a TOSE template, into their own workspace.

This page is for the author who adds the button. The last sections describe what the visitor sees, so you know what to expect.

## What the button does {#what-it-does}

The button is a plain link to `https://app.tose.sh/deploy`. The link names what to deploy: either a GitHub repository or a TOSE template.

- A click only opens a form. It **never creates a project, starts a deployment or charges anything**. The visitor always reviews the form and presses the button themselves.
- The link carries **variable names only**, never values.
- A visitor who is not signed in signs in first, then returns to the same link.

## The quickest way: the generator {#generator}

Open the generator at [tose.sh/deploy-button](https://tose.sh/deploy-button). Enter a repository or a template, fill in any optional fields, and the page:

1. checks every field against the rules in the [link reference](#link-reference);
2. shows a preview of the button in its light and dark versions;
3. gives you the Markdown, HTML and widget snippets, each with a **Copy** button.

Paste the snippet you need into your README or page. The sections below explain each snippet and every parameter, in case you want to write a link by hand.

## Copy-paste snippets {#snippets}

The examples deploy the repository `acme/shop` from the branch `main`, name the project `shop` and ask for two variables. Replace the values with your own.

The button images are served by TOSE:

| Image | Use it on |
|-------|-----------|
| `https://tose.sh/button.svg` | Light backgrounds |
| `https://tose.sh/button-dark.svg` | Dark backgrounds |

### Markdown {#snippet-markdown}

Use this in a README. GitHub renders the image and makes it a link.

```markdown
[![Deploy on TOSE](https://tose.sh/button.svg)](https://app.tose.sh/deploy?repo=https%3A%2F%2Fgithub.com%2Facme%2Fshop&branch=main&name=shop&env=DATABASE_URL%2CSESSION_SECRET)
```

For a dark background, use `https://tose.sh/button-dark.svg` as the image.

### HTML {#snippet-html}

Use this on a website or in any page that accepts HTML.

```html
<a href="https://app.tose.sh/deploy?repo=https%3A%2F%2Fgithub.com%2Facme%2Fshop&amp;branch=main&amp;name=shop&amp;env=DATABASE_URL%2CSESSION_SECRET"><img src="https://tose.sh/button.svg" alt="Deploy on TOSE" height="32"></a>
```

### Widget {#snippet-widget}

The widget is optional. It draws the button for you, and picks the light or dark version from the viewer's color scheme.

```html
<script async src="https://tose.sh/deploy-button.js"></script>
<tose-deploy-button repo="https://github.com/acme/shop" branch="main" name="shop" env="DATABASE_URL,SESSION_SECRET"></tose-deploy-button>
```

- The element takes the same attributes as the link parameters: `repo`, `branch`, `name`, `env`, `template`, `version` and `publisher`. The rules are in the [link reference](#link-reference).
- `theme` is optional. Set `theme="light"` or `theme="dark"` to fix the look. Without it, the button follows the viewer's light or dark mode.
- The button opens the deploy page in a new tab.
- If an attribute is missing or invalid, the button is not drawn and a warning appears in the browser console.
- Scripts do not run in a GitHub README. Use the Markdown snippet there.

For a template, use `template` instead of `repo`:

```html
<tose-deploy-button template="dewee"></tose-deploy-button>
```

## Link reference {#link-reference}

A deploy link has the form `https://app.tose.sh/deploy?` followed by parameters. **Exactly one of `repo` or `template` is required.**

| Parameter | Applies to | Rule | Example |
|-----------|------------|------|---------|
| `repo` | Repository | `https://github.com/{owner}/{repo}`. A trailing `.git` or `/` is ignored. GitHub only, over `https`, with no extra path, query or fragment. The owner is letters, digits and single hyphens (at most 39 characters, no hyphen at the start or end). The repository name is letters, digits, `.`, `_` and `-` (at most 100 characters). | `repo=https://github.com/acme/shop` |
| `branch` | Repository | Optional. The branch to preselect. Letters, digits, `.`, `_`, `-` and `/`, at most 255 characters. It cannot start with `/`, `-` or `.`, cannot end with `/`, `.` or `.lock`, and cannot contain `..`, `//` or `/.`. | `branch=main` |
| `name` | Repository | Optional. The project name to prefill. Lower-case letters, digits and hyphens, at most 63 characters, starting and ending with a letter or digit. | `name=shop` |
| `env` | Repository | Optional. Comma-separated variable names, prefilled as empty rows. A name starts with a letter or `_`, then letters, digits or `_`, at most 128 characters. At most 50 names, no repeats, no spaces. **Names only, never values.** | `env=DATABASE_URL,SESSION_SECRET` |
| `template` | Template | The template key: lower-case letters, digits and hyphens, at most 63 characters, starting and ending with a letter or digit. | `template=dewee` |
| `version` | Template | Optional. A template version: starts with a letter or digit, then letters, digits, `.`, `_`, `+` or `-`, at most 64 characters. Passed to the template deploy wizard. | `version=1.4.0` |
| `publisher` | Template | Optional. The publisher key, with the same rule as `template`. Passed to the template deploy wizard. | `publisher=acme` |

Further rules:

- A repository link accepts only `repo`, `branch`, `name` and `env`. A template link accepts only `template`, `version` and `publisher`.
- Parameter names are case-sensitive. Each appears at most once and none may be empty.
- **Any other parameter makes the link invalid**, including tracking parameters such as `utm_source`. Do not add them.
- Percent-encode values when you write the link by hand (`:` as `%3A`, `/` as `%2F`, `,` as `%2C`). The generator does this for you.
- A template key from the 1-click catalog, such as `dewee` or `goclaw`, opens the catalog's deploy form when the link has no `publisher`. Any other template, or any link with a `publisher`, opens the template deploy wizard.

## What a visitor sees {#visitor-flow}

1. **The link is checked.** If it breaks a rule, the visitor sees an [error page](#troubleshooting) that names each problem, and nothing else happens.
2. **Sign in.** A visitor who is not signed in is sent to the sign-in page and comes back to the same link afterwards.
3. **Pick a workspace.** With one workspace, the visitor goes straight on. With several, they pick one. With none, they are asked to create a first workspace, then continue.
4. **Repository link:** the new-project form opens with the repository, branch, project name and variable names filled in. A banner says the form came from a Deploy on TOSE link. The variable rows are empty, so the visitor types the values. If the branch does not exist in the repository, a note says so and the default branch is selected.
   **Template link:** the template deploy opens with the template, version and publisher from the link.
5. **Review and deploy.** The visitor checks every field and presses the button that creates the project (**Create Project** on the new-project form). Until then nothing exists and nothing is charged.

### Access to the repository {#repository-access}

TOSE reads a repository through the TOSE GitHub App installed on a GitHub account the visitor has connected to the workspace. The form looks for the linked repository among the repositories TOSE can read, and then for the visitor's fork of it:

- **The repository itself.** If TOSE can read the linked repository, for example because the visitor owns it, it is preselected.
- **The visitor's fork.** Otherwise TOSE asks GitHub which of the readable repositories are forks of the linked repository. A fork is recognized under any name. When there is one, it is preselected and a note names it as the visitor's fork. When there are several, they are offered as choices and nothing is preselected until the visitor picks one.
- **A fork TOSE cannot confirm.** If GitHub cannot confirm the forks, the form may ask "is this your fork?" about repositories that are forks with the same name as the linked repository. Nothing is preselected, and the visitor decides.

When TOSE finds no match, the form explains what is missing and offers three actions:

- **Fork on GitHub** opens GitHub's fork page for the linked repository in a new tab. The visitor forks it into an account or organization they control. TOSE never forks on the visitor's behalf.
- **Install or configure the GitHub App** opens GitHub so the visitor can give the TOSE GitHub App access to the account that owns the fork.
- **Check again** reads the connected GitHub accounts again, without leaving the form, and looks for the repository and the fork once more.

The fork lookup reads at most 10 forks per GitHub account, same-named forks first,; a fork beyond that limit may not be found. Looking for a repository changes nothing: the form is submitted only when the visitor presses **Create Project**.

### Cost and the wallet {#cost-and-wallet}

A click costs nothing. Charges follow the normal rules when the visitor creates the project and deploys, against the wallet of the workspace they picked. TOSE refuses a deploy while that workspace's wallet balance is zero or negative, and the visitor has to top up first. See [Pricing](/guide/pricing#when-the-balance-is-zero).

## What the repository needs {#repository-requirements}

The repository must be a normal TOSE-deployable project, the same as for `tose up`. There is no manifest file to add and nothing TOSE-specific to commit for the button. For how TOSE builds a project, see [Getting Started](/guide/getting-started#project-structure) and [Dockerfile Examples](/guide/dockerfile).

If your project needs environment variables, list their names in `env`. The visitor then sees a row for each one and fills in the value. See [Environment Variables](/guide/environment) for how variables work after the deploy.

## Limits {#limits}

- **GitHub only.** `repo` must be a `https://github.com/{owner}/{repo}` URL. GitLab, Bitbucket and other hosts are not supported.
- **A visitor deploys their own repository or their fork.** TOSE does not build straight from someone else's repository, and does not fork for the visitor. A private repository can be deployed only by people whose GitHub account can read it.
- **Variable names only.** A link can name variables but cannot carry values. **Never put a secret, token or password in a link.** A link is public, and it ends up in browser history and in logs.
- **A template must be deployable under its release status.** The template deploy applies the release and directory checks, and a template that fails them cannot be deployed through the link.

## Troubleshooting {#troubleshooting}

A link that breaks a rule opens the **This deploy link is not valid** page (HTTP status 400). It lists every problem at once, so you can fix them in one pass. It follows the language the visitor chose in the dashboard, English or Vietnamese. Nothing was deployed, and the link never redirects anywhere else.

| Message | Cause and fix |
|---------|---------------|
| The link needs a repo or a template parameter. | Add one of them. |
| The link has both repo and template. | Keep one. A link deploys a repository or a template, never both. |
| "{param}" is not a parameter of a deploy link. | Remove it. Only the seven parameters in the [link reference](#link-reference) are allowed, and tracking parameters are not. |
| "{param}" appears more than once. | Keep a single copy. |
| "{param}" is empty. | Give it a value or remove it. |
| "{param}" only applies to a repository link (repo=…). | `branch`, `name` and `env` go with `repo`. Remove it or switch to a repository link. |
| "{param}" only applies to a template link (template=…). | `version` and `publisher` go with `template`. Remove it or switch to a template link. |
| "repo" must be a GitHub repository URL. | Use `https://github.com/OWNER/REPO` with no other path, such as `/tree/main`. |
| "branch" is not a valid branch name. | Check the characters and the start and end of the name. |
| "name" must be lower-case letters, digits and hyphens. | Use lower case, at most 63 characters, and start and end with a letter or digit. |
| "env" must be a comma-separated list of variable names. | Use names such as `DATABASE_URL,API_KEY`, without spaces and without values. |
| "env" lists the same variable name twice. | Remove the repeat. |
| "env" lists more than 50 variable names. | Keep 50 at most. |
| "template" must be a template key. | Use lower-case letters, digits and hyphens. |
| "version" is not a valid template version. | Check the characters. |
| "publisher" must be a publisher key. | Use lower-case letters, digits and hyphens. |

Other things a visitor can run into:

| What they see | What to do |
|---------------|------------|
| TOSE cannot see the repository yet. | Follow [Access to the repository](#repository-access): fork or install the GitHub App, then **Check again**. |
| Could not load your workspaces. | Reload the page. |

To test your link, open it while signed out, then again after signing in. Check that the form arrives with your values filled in and that no unexpected parameter was added by the site that hosts your README.

## Related {#related}

- [Git Integration](/guide/git) - Connect a repository for automatic deploys
- [Getting Started](/guide/getting-started) - Deploy with the CLI
- [Environment Variables](/guide/environment) - Manage variables after the deploy
- [Pricing](/guide/pricing) - Wallet and billing rules
