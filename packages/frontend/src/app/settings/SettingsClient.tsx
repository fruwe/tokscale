"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "nextjs-toploader/app";
import styled from "styled-components";
import { KeyIcon } from "@/components/ui/Icons";
import { Navigation } from "@/components/layout/Navigation";
import { Footer } from "@/components/layout/Footer";

interface User {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
}

interface ApiToken {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

// ============================================================================
// Shared styled components
// ============================================================================

const PageWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const MainContent = styled.main`
  flex: 1;
  max-width: 768px;
  margin: 0 auto;
  padding: 40px 24px;
  width: 100%;
`;

const LoadingMain = styled.main`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Title = styled.h1`
  font-size: 30px;
  font-weight: bold;
  margin-bottom: 32px;
`;

const Section = styled.section`
  border-radius: 16px;
  border: 1px solid;
  padding: 24px;
  margin-bottom: 24px;
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
`;

const ProfileWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const ProfileText = styled.p`
  font-weight: 500;
`;

const SmallText = styled.p`
  font-size: 14px;
`;

const CodeText = styled.code`
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 12px;
`;

const Description = styled.p`
  font-size: 14px;
  margin-bottom: 16px;
`;

const EmptyState = styled.div`
  padding: 32px 0;
  text-align: center;
`;

const EmptyIcon = styled.div`
  margin: 0 auto 12px;
  opacity: 0.5;
`;

const EmptyText = styled.p`
  font-size: 14px;
  margin-top: 8px;
`;

const TokenList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TokenItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-radius: 12px;
`;

const TokenInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const IconWrapper = styled.div`
  color: #737373;
`;


const DangerButton = styled.button`
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid #F85149;
  background: transparent;
  color: #F85149;
  cursor: pointer;
  transition: all 150ms;
  &:hover { background: #F85149; color: #FFFFFF; }
`;

const InfoBanner = styled.div`
  padding: 12px 16px;
  border-radius: 6px;
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-subtle);
  color: var(--color-fg-muted);
  font-size: 14px;
`;

const AvatarImg = styled.img`
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
`;

const TokenName = styled.p`
  font-weight: 500;
`;

// ============================================================================
// Danger Zone styled components
// ============================================================================

const DangerSection = styled(Section)`
  border-color: rgba(248, 81, 73, 0.4);
`;

const DangerSectionTitle = styled(SectionTitle)`
  color: #F85149;
`;

const DangerActionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 0;

  &:not(:last-child) {
    border-bottom: 1px solid var(--color-border-default);
  }
`;

const DangerActionInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const DangerActionTitle = styled.p`
  font-size: 14px;
  font-weight: 500;
  color: var(--color-fg-default);
  margin-bottom: 4px;
`;

const DangerActionDescription = styled.p`
  font-size: 13px;
  color: var(--color-fg-muted);
`;

const DangerActionButton = styled(DangerButton)`
  flex-shrink: 0;
  padding: 6px 16px;
  font-size: 13px;
`;

// ============================================================================
// Confirmation modal styled components
// ============================================================================

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
`;

const ModalCard = styled.div`
  background: var(--color-bg-default);
  border: 1px solid var(--color-border-default);
  border-radius: 16px;
  padding: 24px;
  max-width: 480px;
  width: calc(100% - 32px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35);
`;

const ModalTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #F85149;
  margin-bottom: 12px;
`;

const ModalBody = styled.p`
  font-size: 14px;
  color: var(--color-fg-muted);
  line-height: 1.5;
  margin-bottom: 20px;
`;

const ModalBulletList = styled.ul`
  list-style: disc;
  padding-left: 20px;
  margin-bottom: 20px;
  color: var(--color-fg-muted);
  font-size: 14px;
  line-height: 1.6;
`;

const ModalInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-subtle);
  color: var(--color-fg-default);
  font-size: 14px;
  margin-bottom: 16px;
  outline: none;
  box-sizing: border-box;
  &:focus {
    border-color: #F85149;
    box-shadow: 0 0 0 2px rgba(248, 81, 73, 0.2);
  }
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const CancelButton = styled.button`
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid var(--color-border-default);
  background: transparent;
  color: var(--color-fg-default);
  cursor: pointer;
  transition: all 150ms;
  &:hover {
    background: var(--color-bg-subtle);
  }
`;

const ConfirmDangerButton = styled.button<{ $disabled?: boolean }>`
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid #F85149;
  background: ${({ $disabled }) => ($disabled ? "transparent" : "#F85149")};
  color: ${({ $disabled }) => ($disabled ? "rgba(248, 81, 73, 0.4)" : "#FFFFFF")};
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  transition: all 150ms;
  &:hover {
    background: ${({ $disabled }) => ($disabled ? "transparent" : "#da3633")};
  }
`;

const StepIndicator = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
`;

const StepDot = styled.div<{ $active: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $active }) => ($active ? "#F85149" : "var(--color-border-default)")};
  transition: background 150ms;
`;

// ============================================================================
// Confirmation modal component
// ============================================================================

type DangerAction = "delete-data" | "delete-account";

interface ConfirmationConfig {
  title: string;
  steps: Array<{
    body: React.ReactNode;
    confirmLabel: string;
  }>;
  typedConfirmation: string;
  onConfirm: () => Promise<void>;
}

const CONFIRMATION_CONFIGS: Record<DangerAction, ConfirmationConfig> = {
  "delete-data": {
    title: "Delete submitted data",
    steps: [
      {
        body: (
          <>
            <ModalBody>This will permanently remove all submitted usage data from your account:</ModalBody>
            <ModalBulletList>
              <li>Leaderboard entries</li>
              <li>Public profile stats</li>
              <li>Daily usage history</li>
            </ModalBulletList>
            <ModalBody style={{ marginBottom: 0 }}>
              Your account and API tokens will remain active. You can submit new data at any time.
            </ModalBody>
          </>
        ),
        confirmLabel: "I want to delete my data",
      },
      {
        body: (
          <ModalBody>
            This action <strong>cannot be undone</strong>. All your historical
            token usage and cost data will be permanently erased from the
            leaderboard and your public profile.
          </ModalBody>
        ),
        confirmLabel: "I understand, continue",
      },
    ],
    typedConfirmation: "delete my data",
    onConfirm: async () => {
      const res = await fetch("/api/settings/submitted-data", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete submitted data");
    },
  },
  "delete-account": {
    title: "Delete account",
    steps: [
      {
        body: (
          <>
            <ModalBody>This will permanently delete your entire account and all associated data:</ModalBody>
            <ModalBulletList>
              <li>User profile</li>
              <li>All submitted usage data</li>
              <li>Leaderboard entries</li>
              <li>API tokens and active sessions</li>
            </ModalBulletList>
            <ModalBody style={{ marginBottom: 0 }}>
              You will be signed out immediately. This cannot be reversed.
            </ModalBody>
          </>
        ),
        confirmLabel: "I want to delete my account",
      },
      {
        body: (
          <ModalBody>
            This action is <strong>permanent and irreversible</strong>. Your
            username will become available for others to register. All your data
            — submissions, tokens, sessions — will be wiped.
          </ModalBody>
        ),
        confirmLabel: "I understand, continue",
      },
    ],
    typedConfirmation: "delete my account",
    onConfirm: async () => {
      const res = await fetch("/api/settings/account", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete account");
    },
  },
};

function DangerConfirmationModal({
  action,
  onClose,
  onSuccess,
}: {
  action: DangerAction;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const config = CONFIRMATION_CONFIGS[action];
  const totalSteps = config.steps.length + 1; // +1 for typed confirmation step
  const [step, setStep] = useState(0);
  const [typedValue, setTypedValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isTypedStep = step === config.steps.length;
  const typedMatch = typedValue.toLowerCase().trim() === config.typedConfirmation;

  const handleConfirm = useCallback(async () => {
    if (isTypedStep) {
      if (!typedMatch || isSubmitting) return;
      setIsSubmitting(true);
      try {
        await config.onConfirm();
        onSuccess();
      } catch {
        alert(`Failed to ${action === "delete-data" ? "delete submitted data" : "delete account"}. Please try again.`);
        setIsSubmitting(false);
      }
    } else {
      setStep((s) => s + 1);
    }
  }, [isTypedStep, typedMatch, isSubmitting, config, onSuccess, action]);

  return (
    <ModalOverlay onClick={isSubmitting ? undefined : onClose}>
      <ModalCard onClick={(e) => e.stopPropagation()}>
        <StepIndicator>
          {["step-1", "step-2", "step-3"].slice(0, totalSteps).map((id, i) => (
            <StepDot key={id} $active={i <= step} />
          ))}
        </StepIndicator>

        <ModalTitle>⚠ {config.title}</ModalTitle>

        {isTypedStep ? (
          <>
            <ModalBody>
              Type <strong>{config.typedConfirmation}</strong> to confirm:
            </ModalBody>
            <ModalInput
              autoFocus
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              placeholder={config.typedConfirmation}
              onKeyDown={(e) => {
                if (e.key === "Enter" && typedMatch && !isSubmitting) {
                  handleConfirm();
                }
              }}
            />
          </>
        ) : (
          config.steps[step].body
        )}

        <ModalActions>
          <CancelButton onClick={onClose} disabled={isSubmitting}>
            Cancel
          </CancelButton>
          <ConfirmDangerButton
            $disabled={isTypedStep ? !typedMatch : false}
            disabled={(isTypedStep && !typedMatch) || isSubmitting}
            onClick={handleConfirm}
          >
            {isSubmitting
              ? "Deleting..."
              : isTypedStep
                ? config.steps[config.steps.length - 1].confirmLabel.replace("I understand, continue", "Delete permanently")
                : config.steps[step].confirmLabel}
          </ConfirmDangerButton>
        </ModalActions>
      </ModalCard>
    </ModalOverlay>
  );
}

// ============================================================================
// Main component
// ============================================================================

export default function SettingsClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dangerAction, setDangerAction] = useState<DangerAction | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.push("/api/auth/github?returnTo=/settings");
          return;
        }
        setUser(data.user);
        setIsLoading(false);
      })
      .catch(() => {
        router.push("/leaderboard");
      });

    fetch("/api/settings/tokens")
      .then((res) => res.json())
      .then((data) => {
        if (data.tokens) {
          setTokens(data.tokens);
        }
      })
      .catch(() => {});
  }, [router]);

  const handleRevokeToken = async (tokenId: string) => {
    if (!confirm("Are you sure you want to revoke this token?")) return;

    try {
      const response = await fetch(`/api/settings/tokens/${tokenId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTokens(tokens.filter((t) => t.id !== tokenId));
      }
    } catch {
      alert("Failed to revoke token");
    }
  };

  const handleDangerSuccess = useCallback(() => {
    if (dangerAction === "delete-account") {
      // Account is gone — redirect to home.
      window.location.href = "/";
    } else {
      // Data deleted — close modal and stay.
      setDangerAction(null);
      alert("Submitted data has been deleted.");
    }
  }, [dangerAction]);

  if (isLoading) {
    return (
      <PageWrapper style={{ backgroundColor: "var(--color-bg-default)" }}>
        <Navigation />
        <LoadingMain>
          <div style={{ color: "var(--color-fg-muted)" }}>Loading...</div>
        </LoadingMain>
        <Footer />
      </PageWrapper>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <PageWrapper style={{ backgroundColor: "var(--color-bg-default)" }}>
      <Navigation />

      <MainContent>
        <Title style={{ color: "var(--color-fg-default)" }}>
          Settings
        </Title>

        <Section
          style={{ backgroundColor: "var(--color-bg-default)", borderColor: "var(--color-border-default)" }}
        >
          <SectionTitle style={{ color: "var(--color-fg-default)" }}>
            Profile
          </SectionTitle>
          <ProfileWrapper>
            <AvatarImg
              src={user.avatarUrl || `https://github.com/${user.username}.png`}
              alt={user.username}
              width={64}
              height={64}
            />
            <div>
              <ProfileText style={{ color: "var(--color-fg-default)" }}>
                {user.displayName || user.username}
              </ProfileText>
              <SmallText style={{ color: "var(--color-fg-muted)" }}>
                @{user.username}
              </SmallText>
              {user.email && (
                <SmallText style={{ color: "var(--color-fg-muted)" }}>
                  {user.email}
                </SmallText>
              )}
            </div>
          </ProfileWrapper>
          <InfoBanner style={{ marginTop: 16 }}>
            Profile information is synced from GitHub and cannot be edited here.
          </InfoBanner>
        </Section>

        <Section
          style={{ backgroundColor: "var(--color-bg-default)", borderColor: "var(--color-border-default)" }}
        >
          <SectionTitle style={{ color: "var(--color-fg-default)" }}>
            API Tokens
          </SectionTitle>
          <Description style={{ color: "var(--color-fg-muted)" }}>
            Tokens are created when you run{" "}
            <CodeText
              style={{ backgroundColor: "var(--color-bg-subtle)" }}
            >
              tokscale login
            </CodeText>{" "}
            from the CLI.
          </Description>

          {tokens.length === 0 ? (
            <EmptyState style={{ color: "var(--color-fg-muted)" }}>
              <EmptyIcon>
                <KeyIcon size={32} />
              </EmptyIcon>
              <p>No API tokens yet.</p>
              <EmptyText>
                Run{" "}
                <CodeText
                  style={{ backgroundColor: "var(--color-bg-subtle)" }}
                >
                  tokscale login
                </CodeText>{" "}
                to create one.
              </EmptyText>
            </EmptyState>
          ) : (
            <TokenList>
              {tokens.map((token) => (
                <TokenItem
                  key={token.id}
                  style={{ backgroundColor: "var(--color-bg-elevated)" }}
                >
                  <TokenInfo>
                    <IconWrapper>
                      <KeyIcon size={20} />
                    </IconWrapper>
                    <div>
                      <TokenName style={{ color: "var(--color-fg-default)" }}>
                        {token.name}
                      </TokenName>
                      <SmallText style={{ color: "var(--color-fg-muted)" }}>
                        Created {new Date(token.createdAt).toLocaleDateString()}
                        {token.lastUsedAt && (
                          <> - Last used {new Date(token.lastUsedAt).toLocaleDateString()}</>
                        )}
                      </SmallText>
                    </div>
                  </TokenInfo>
                  <DangerButton
                    onClick={() => handleRevokeToken(token.id)}
                  >
                    Revoke
                  </DangerButton>
                </TokenItem>
              ))}
            </TokenList>
          )}
        </Section>

        <DangerSection
          style={{ backgroundColor: "var(--color-bg-default)" }}
        >
          <DangerSectionTitle>
            Danger Zone
          </DangerSectionTitle>

          <DangerActionRow>
            <DangerActionInfo>
              <DangerActionTitle>Delete submitted data</DangerActionTitle>
              <DangerActionDescription>
                Remove all leaderboard entries, profile stats, and usage
                history. Your account and API tokens stay active.
              </DangerActionDescription>
            </DangerActionInfo>
            <DangerActionButton onClick={() => setDangerAction("delete-data")}>
              Delete data
            </DangerActionButton>
          </DangerActionRow>

          <DangerActionRow>
            <DangerActionInfo>
              <DangerActionTitle>Delete account</DangerActionTitle>
              <DangerActionDescription>
                Permanently delete your account and all associated data. This
                action is irreversible.
              </DangerActionDescription>
            </DangerActionInfo>
            <DangerActionButton onClick={() => setDangerAction("delete-account")}>
              Delete account
            </DangerActionButton>
          </DangerActionRow>
        </DangerSection>

      </MainContent>

      <Footer />

      {dangerAction && (
        <DangerConfirmationModal
          action={dangerAction}
          onClose={() => setDangerAction(null)}
          onSuccess={handleDangerSuccess}
        />
      )}
    </PageWrapper>
  );
}
