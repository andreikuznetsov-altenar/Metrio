import { describe, expect, it } from "vitest";
import { resolveJiraIdentity, toPersonJiraIdentity } from "../../domain/people/identityResolver";
import type { TeamUser } from "../../domain/jira/types";
import type { ResolvedEmployee } from "../bamboo/orgResolver";

function employee(
  id: string,
  displayName: string,
  workEmail: string,
): ResolvedEmployee {
  return {
    id,
    displayName,
    firstName: displayName.split(" ")[0] || displayName,
    lastName: "",
    workEmail,
    jobTitle: "Engineer",
    status: "Active",
  };
}

describe("performance identity resolution", () => {
  it('resolves Jira user for Bamboo id "1114" by work email', () => {
    const teamUsers: TeamUser[] = [
      {
        accountId: "jira-acct-1114",
        displayName: "Real Person",
        email: "real.person@co.com",
        canonical: "jira-acct-1114",
      },
    ];
    const mapping = resolveJiraIdentity(
      employee("1114", "Real Person", "real.person@co.com"),
      teamUsers,
    );
    const { jira, identity } = toPersonJiraIdentity(mapping);
    expect(jira?.accountId).toBe("jira-acct-1114");
    expect(identity.matchedBy).toBe("email");
    expect(jira?.accountId).not.toBe("1114");
  });

  it("leaves identity explicitly unresolved without fabricating Jira user", () => {
    const { jira, identity } = toPersonJiraIdentity(
      resolveJiraIdentity(employee("982", "Alex Worker", "alex@co.com"), []),
    );
    expect(jira).toBeNull();
    expect(identity.matchedBy).toBe("unresolved");
  });
});
