// src/services/auth.ts
import { supabase } from './supabase'

export const validateInvitationCode = async (code: string) => {
  // First, check if invitation code exists and is valid
  const { data: tokenData, error: tokenError } = await supabase
    .from('rsvp_tokens')
    .select(`
      id,
      member_id,
      invitation_type,
      expires_at,
      used_at
    `)
    .eq('token', code)
    .eq('invitation_type', 'app_invitation')
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (tokenError || !tokenData) {
    console.error('Token validation error:', tokenError);
    throw new Error('Invalid or expired invitation code');
  }

  // Then fetch the member separately
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('*')
    .eq('id', tokenData.member_id)
    .single();

  if (memberError || !memberData) {
    console.error('Member fetch error:', memberError);
    throw new Error('Member not found for this invitation');
  }

  return {
    ...tokenData,
    members: memberData
  };
};

export const checkIfMemberHasAccount = async (memberId: string) => {
  const { data: member } = await supabase
    .from('members')
    .select('auth_user_id')
    .eq('id', memberId)
    .single();
  
  return member?.auth_user_id ? true : false;
};

export const createUserAccount = async (memberId: string, email: string, password: string) => {
  // Create Supabase auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email,
    password: password,
  });

  if (authError) {
    throw new Error(`Failed to create account: ${authError.message}`);
  }

  if (!authData.user) {
    throw new Error('Failed to create user account');
  }

  // Link the Supabase auth user to the member record
  const { error: updateError } = await supabase
    .from('members')
    .update({ 
      auth_user_id: authData.user.id,
      email: email // Update email if they want to use a different one
    })
    .eq('id', memberId);

  if (updateError) {
    throw new Error(`Failed to link account: ${updateError.message}`);
  }

  return authData.user;
};

export const signInWithInvitation = async (code: string) => {
  // Validate invitation code
  const invitation = await validateInvitationCode(code);
  const memberId = invitation.member_id;
  
  // Check if member already has an account
  const hasAccount = await checkIfMemberHasAccount(memberId);
  
  if (hasAccount) {
    // They already have an account, redirect to login
    throw new Error('ACCOUNT_EXISTS');
  }

  // Mark invitation token as used
  await supabase
    .from('rsvp_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invitation.id);

  // Return member data for account setup
  return {
    member: invitation.members,
    needsAccountSetup: true
  };
};

export const signInWithEmailPassword = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw new Error(`Login failed: ${error.message}`);
  }

  // Get the member data associated with this auth user
  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('auth_user_id', data.user.id)
    .single();

  return { user: data.user, member };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  // Get member data
  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  return { user, member };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(`Sign out failed: ${error.message}`);
  }
};