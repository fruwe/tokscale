"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import styled from "styled-components";
import { Switch } from "@/components/Switch";

const Container = styled.div`
  max-width: 560px;
  margin: 0 auto;
  padding-top: 24px;
`;

const Title = styled.h1`
  font-size: 30px;
  font-weight: bold;
  margin-bottom: 8px;
  color: var(--color-fg-default);
`;

const Description = styled.p`
  margin-bottom: 32px;
  color: var(--color-fg-muted);
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: var(--color-fg-default);
`;

const Input = styled.input`
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

const TextArea = styled.textarea`
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--color-border-default);
  background-color: var(--color-bg-subtle);
  color: var(--color-fg-default);
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #0073ff;
    box-shadow: 0 0 0 2px rgba(0, 115, 255, 0.2);
  }
`;

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ToggleLabel = styled.div``;

const ToggleTitle = styled.p`
  font-size: 14px;
  font-weight: 500;
  color: var(--color-fg-default);
`;

const ToggleDescription = styled.p`
  font-size: 12px;
  color: var(--color-fg-muted);
`;

const SubmitButton = styled.button`
  padding: 10px 20px;
  background-color: #0073ff;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s;

  &:hover:not(:disabled) {
    background-color: #005fcc;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.p`
  color: #f85149;
  font-size: 14px;
`;

export default function CreateGroupClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          isPublic,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create group");
      }

      const group = await res.json();
      router.push(`/groups/${group.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  };

  return (
    <Container>
      <Title>Create a Group</Title>
      <Description>
        Set up a group to track and compare token usage with your team
      </Description>

      <Form onSubmit={handleSubmit}>
        <FieldGroup>
          <Label htmlFor="name">Group Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Team"
            maxLength={100}
            required
          />
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="description">Description</Label>
          <TextArea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this group for?"
            maxLength={500}
          />
        </FieldGroup>

        <ToggleRow>
          <ToggleLabel>
            <ToggleTitle>Public Group</ToggleTitle>
            <ToggleDescription>
              {isPublic
                ? "Anyone can see this group and its leaderboard"
                : "Only members can see this group"}
            </ToggleDescription>
          </ToggleLabel>
          <Switch
            checked={isPublic}
            onChange={setIsPublic}
            leftLabel=""
            rightLabel=""
          />
        </ToggleRow>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <SubmitButton type="submit" disabled={isSubmitting || !name.trim()}>
          {isSubmitting ? "Creating..." : "Create Group"}
        </SubmitButton>
      </Form>
    </Container>
  );
}
