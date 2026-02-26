"use client";

import { useState, useEffect, useCallback } from "react";
import styled from "styled-components";

const Container = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding-top: 24px;
`;

const BackLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: var(--color-fg-muted);
  text-decoration: none;
  margin-bottom: 24px;

  &:hover {
    color: var(--color-fg-default);
  }
`;

const Title = styled.h1`
  font-size: 30px;
  font-weight: bold;
  margin-bottom: 32px;
  color: var(--color-fg-default);
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--color-fg-default);
`;

const InviteForm = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 32px;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

const Input = styled.input`
  flex: 1;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--color-border-default);
  background-color: var(--color-bg-subtle);
  color: var(--color-fg-default);
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #0073ff;
    box-shadow: 0 0 0 2px rgba(0, 115, 255, 0.2);
  }
`;

const Select = styled.select`
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--color-border-default);
  background-color: var(--color-bg-subtle);
  color: var(--color-fg-default);
  font-size: 14px;
`;

const InviteButton = styled.button`
  padding: 10px 16px;
  background-color: #0073ff;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background-color: #005fcc;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const MemberList = styled.div`
  border-radius: 12px;
  border: 1px solid var(--color-border-default);
  overflow: hidden;
  margin-bottom: 32px;
`;

const MemberRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-default);

  &:last-child {
    border-bottom: none;
  }
`;

const MemberInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const MemberDetails = styled.div``;

const MemberName = styled.p`
  font-size: 14px;
  font-weight: 500;
  color: var(--color-fg-default);
`;

const MemberUsername = styled.p`
  font-size: 12px;
  color: var(--color-fg-muted);
`;

const MemberActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RoleBadge = styled.span<{ $role: string }>`
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 8px;
  font-weight: 500;

  ${({ $role }) =>
    $role === "owner"
      ? `background: rgba(234, 179, 8, 0.15); color: #EAB308;`
      : $role === "admin"
        ? `background: rgba(0, 115, 255, 0.1); color: #0073FF;`
        : `background: rgba(139, 148, 158, 0.1); color: var(--color-fg-muted);`}
`;

const SmallButton = styled.button`
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--color-border-default);
  background: transparent;
  color: var(--color-fg-muted);
  font-size: 12px;
  cursor: pointer;

  &:hover {
    border-color: #0073ff;
    color: var(--color-fg-default);
  }
`;

const DangerSmallButton = styled(SmallButton)`
  &:hover {
    border-color: #f85149;
    color: #f85149;
  }
`;

const ErrorMessage = styled.p`
  color: #f85149;
  font-size: 14px;
  margin-bottom: 16px;
`;

const SuccessMessage = styled.p`
  color: #3fb950;
  font-size: 14px;
  margin-bottom: 16px;
`;

const PendingInviteRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--color-border-default);

  &:last-child {
    border-bottom: none;
  }
`;

const InviteInfo = styled.div`
  font-size: 14px;
  color: var(--color-fg-default);
`;

const InviteRole = styled.span`
  font-size: 12px;
  color: var(--color-fg-muted);
  margin-left: 8px;
`;

interface Member {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface PendingInvite {
  id: string;
  invitedUsername: string | null;
  role: string;
  status: string;
  createdAt: string;
}

interface GroupMembersClientProps {
  group: { id: string; name: string; slug: string };
  userRole: string;
  currentUserId: string;
}

export default function GroupMembersClient({
  group,
  userRole,
  currentUserId,
}: GroupMembersClientProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isOwner = userRole === "owner";

  const fetchMembers = useCallback(async () => {
    const res = await fetch(`/api/groups/${group.slug}/members`);
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members);
    }
  }, [group.slug]);

  const fetchInvites = useCallback(async () => {
    const res = await fetch(`/api/groups/${group.slug}/invite`);
    if (res.ok) {
      const data = await res.json();
      setInvites(data.invites);
    }
  }, [group.slug]);

  useEffect(() => {
    fetchMembers();
    fetchInvites();
  }, [fetchMembers, fetchInvites]);

  const handleInvite = async () => {
    if (!inviteUsername.trim()) return;
    setIsInviting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/groups/${group.slug}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: inviteUsername.trim(),
          role: inviteRole,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to invite");
      }

      setSuccess(`Invited @${inviteUsername.trim()} as ${inviteRole}`);
      setInviteUsername("");
      fetchInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string, username: string) => {
    if (!confirm(`Remove @${username} from the group?`)) return;

    try {
      const res = await fetch(`/api/groups/${group.slug}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        fetchMembers();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to remove member");
      }
    } catch {
      setError("Failed to remove member");
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(
        `/api/groups/${group.slug}/members/${userId}/role`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (res.ok) {
        fetchMembers();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to change role");
      }
    } catch {
      setError("Failed to change role");
    }
  };

  return (
    <Container>
      <BackLink href={`/groups/${group.slug}`}>← Back to group</BackLink>
      <Title>Members — {group.name}</Title>

      <SectionTitle>Invite Member</SectionTitle>
      <InviteForm>
        <Input
          value={inviteUsername}
          onChange={(e) => setInviteUsername(e.target.value)}
          placeholder="GitHub username"
        />
        <Select
          value={inviteRole}
          onChange={(e) => setInviteRole(e.target.value)}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </Select>
        <InviteButton
          onClick={handleInvite}
          disabled={isInviting || !inviteUsername.trim()}
        >
          {isInviting ? "Inviting..." : "Invite"}
        </InviteButton>
      </InviteForm>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}

      <SectionTitle>
        Members ({members.length})
      </SectionTitle>
      <MemberList>
        {members.map((member) => (
          <MemberRow key={member.id}>
            <MemberInfo>
              <img
                src={
                  member.avatarUrl ||
                  `https://github.com/${member.username}.png`
                }
                alt={member.username}
                width={36}
                height={36}
                style={{ borderRadius: "50%", objectFit: "cover" }}
              />
              <MemberDetails>
                <MemberName>
                  {member.displayName || member.username}
                </MemberName>
                <MemberUsername>@{member.username}</MemberUsername>
              </MemberDetails>
            </MemberInfo>
            <MemberActions>
              <RoleBadge $role={member.role}>{member.role}</RoleBadge>
              {isOwner &&
                member.userId !== currentUserId &&
                member.role !== "owner" && (
                  <>
                    <SmallButton
                      onClick={() =>
                        handleChangeRole(
                          member.userId,
                          member.role === "admin" ? "member" : "admin"
                        )
                      }
                    >
                      {member.role === "admin"
                        ? "Demote"
                        : "Promote"}
                    </SmallButton>
                    <DangerSmallButton
                      onClick={() =>
                        handleRemoveMember(member.userId, member.username)
                      }
                    >
                      Remove
                    </DangerSmallButton>
                  </>
                )}
              {!isOwner &&
                member.userId !== currentUserId &&
                member.role === "member" && (
                  <DangerSmallButton
                    onClick={() =>
                      handleRemoveMember(member.userId, member.username)
                    }
                  >
                    Remove
                  </DangerSmallButton>
                )}
            </MemberActions>
          </MemberRow>
        ))}
      </MemberList>

      {invites.length > 0 && (
        <>
          <SectionTitle>
            Pending Invites ({invites.length})
          </SectionTitle>
          <MemberList>
            {invites.map((invite) => (
              <PendingInviteRow key={invite.id}>
                <InviteInfo>
                  @{invite.invitedUsername}
                  <InviteRole>as {invite.role}</InviteRole>
                </InviteInfo>
              </PendingInviteRow>
            ))}
          </MemberList>
        </>
      )}
    </Container>
  );
}
