import { supabase } from "@/integrations/supabase/client";
import {
  sendApplicationConfirmation,
  sendApplicationStatusUpdate,
  sendEmployerNewApplication,
  sendNewMessageEmail,
  sendJobAlertDigest,
  shouldSendEmail,
  type SendEmailResult,
} from "@/lib/email";

// Status colors and classes
const STATUS_CONFIG: Record<string, { color: string; class: string }> = {
  pending: { color: '#f59e0b', class: 'pending' },
  reviewing: { color: '#3b82f6', class: 'reviewing' },
  shortlisted: { color: '#8b5cf6', class: 'shortlisted' },
  interviewed: { color: '#6366f1', class: 'interviewed' },
  offered: { color: '#10b981', class: 'offered' },
  rejected: { color: '#ef4444', class: 'rejected' },
  withdrawn: { color: '#6b7280', class: 'withdrawn' },
  accepted: { color: '#059669', class: 'accepted' }
};

function getSiteUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://careersasa.co.ke';
}

// Create and send new application notification to employer
export async function sendNewApplicationNotification(
  employerId: string,
  employerEmail: string,
  employerName: string,
  jobTitle: string,
  companyName: string,
  candidateName: string,
  yearsExperience: number,
  coverLetter?: string,
  expectedSalary?: number
) {
  try {
    // Create in-app notification
    const { data: notification, error: notificationError } = await supabase
      .rpc('create_notification', {
        user_uuid: employerId,
        notification_type: 'new_application',
        notification_title: `New Application: ${jobTitle}`,
        notification_message: `${candidateName} has applied for ${jobTitle} at ${companyName}`,
        notification_data: {
          job_title: jobTitle,
          company_name: companyName,
          candidate_name: candidateName,
          years_experience: yearsExperience,
          cover_letter: coverLetter,
          expected_salary: expectedSalary
        }
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    // Send email to employer (transactional, always sent)
    let emailResult: SendEmailResult = { success: false };
    try {
      emailResult = await sendEmployerNewApplication(
        employerEmail,
        employerName,
        jobTitle,
        candidateName,
        employerId
      );
    } catch (emailErr) {
      console.error('Failed to send employer email:', emailErr);
    }

    // Update notification to mark email as sent
    if (emailResult.success && notification) {
      await supabase
        .from('notifications')
        .update({ emailed: true })
        .eq('id', notification);
    }

    return true;
  } catch (error) {
    console.error('Error sending new application notification:', error);
    return false;
  }
}

// Send application confirmation to candidate
export async function sendApplicationConfirmationNotification(
  candidateId: string,
  candidateEmail: string,
  candidateName: string,
  jobTitle: string,
  companyName: string
) {
  try {
    // Create in-app notification
    const { data: notification, error: notificationError } = await supabase
      .rpc('create_notification', {
        user_uuid: candidateId,
        notification_type: 'application_confirmation',
        notification_title: `Application Submitted: ${jobTitle}`,
        notification_message: `Your application for ${jobTitle} at ${companyName} has been received`,
        notification_data: {
          job_title: jobTitle,
          company_name: companyName,
        }
      });

    if (notificationError) {
      console.error('Error creating confirmation notification:', notificationError);
    }

    // Send email (transactional, always sent)
    let emailResult: SendEmailResult = { success: false };
    try {
      emailResult = await sendApplicationConfirmation(
        candidateEmail,
        candidateName,
        jobTitle,
        companyName,
        candidateId
      );
    } catch (emailErr) {
      console.error('Failed to send confirmation email:', emailErr);
    }

    if (emailResult.success && notification) {
      await supabase
        .from('notifications')
        .update({ emailed: true })
        .eq('id', notification);
    }

    return true;
  } catch (error) {
    console.error('Error sending application confirmation:', error);
    return false;
  }
}

// Create and send application status update notification to candidate
export async function sendApplicationStatusNotification(
  candidateId: string,
  candidateEmail: string,
  candidateName: string,
  jobTitle: string,
  companyName: string,
  status: string,
  statusMessage?: string
) {
  try {
    const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

    // Create in-app notification
    const { data: notification, error: notificationError } = await supabase
      .rpc('create_notification', {
        user_uuid: candidateId,
        notification_type: 'application_status',
        notification_title: `Application Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        notification_message: `Your application for ${jobTitle} at ${companyName} has been updated to: ${status}`,
        notification_data: {
          job_title: jobTitle,
          company_name: companyName,
          status: status,
          status_message: statusMessage
        }
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    // Check preferences and send email
    let emailResult: SendEmailResult = { success: false };
    const shouldSend = await shouldSendEmail(candidateId, 'application_status');
    if (shouldSend) {
      try {
        emailResult = await sendApplicationStatusUpdate(
          candidateEmail,
          candidateName,
          jobTitle,
          companyName,
          status,
          statusMessage,
          candidateId
        );
      } catch (emailErr) {
        console.error('Failed to send status update email:', emailErr);
      }
    }

    if (emailResult.success && notification) {
      await supabase
        .from('notifications')
        .update({ emailed: true })
        .eq('id', notification);
    }

    return true;
  } catch (error) {
    console.error('Error sending application status notification:', error);
    return false;
  }
}

// Create and send new message notification
export async function sendNewMessageNotification(
  recipientId: string,
  recipientEmail: string,
  recipientName: string,
  senderName: string,
  jobTitle: string,
  companyName: string,
  messagePreview: string
) {
  try {
    // Create in-app notification
    const { data: notification, error: notificationError } = await supabase
      .rpc('create_notification', {
        user_uuid: recipientId,
        notification_type: 'new_message',
        notification_title: `New Message from ${senderName}`,
        notification_message: `Regarding your application for ${jobTitle} at ${companyName}`,
        notification_data: {
          job_title: jobTitle,
          company_name: companyName,
          sender_name: senderName,
          message_preview: messagePreview
        }
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    // Check preferences and send email
    let emailResult: SendEmailResult = { success: false };
    const shouldSend = await shouldSendEmail(recipientId, 'new_message');
    if (shouldSend) {
      try {
        emailResult = await sendNewMessageEmail(
          recipientEmail,
          recipientName,
          senderName,
          jobTitle,
          messagePreview,
          recipientId
        );
      } catch (emailErr) {
        console.error('Failed to send message email:', emailErr);
      }
    }

    if (emailResult.success && notification) {
      await supabase
        .from('notifications')
        .update({ emailed: true })
        .eq('id', notification);
    }

    return true;
  } catch (error) {
    console.error('Error sending new message notification:', error);
    return false;
  }
}

// Send job alert notification
export async function sendJobAlertNotification(
  userId: string,
  userEmail: string,
  userName: string,
  jobTitle: string,
  companyName: string,
  jobLocation: string,
  jobId: string
) {
  try {
    // Create in-app notification
    const { data: notification, error: notificationError } = await supabase
      .rpc('create_notification', {
        user_uuid: userId,
        notification_type: 'job_alert',
        notification_title: `New Job Alert: ${jobTitle}`,
        notification_message: `A new job matching your preferences: ${jobTitle} at ${companyName}`,
        notification_data: {
          job_title: jobTitle,
          company_name: companyName,
          job_location: jobLocation,
          job_id: jobId
        }
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    return true;
  } catch (error) {
    console.error('Error sending job alert notification:', error);
    return false;
  }
}

// Send batch job alert digest (used by cron)
export async function sendJobAlertDigestNotification(
  userId: string,
  userEmail: string,
  userName: string,
  jobs: Array<{ id: string; title: string; company: string; location: string; type: string }>
) {
  try {
    if (jobs.length === 0) return true;

    const shouldSend = await shouldSendEmail(userId, 'job_alert');
    if (!shouldSend) return true;

    const result = await sendJobAlertDigest(userEmail, userName, jobs, userId);
    return result.success;
  } catch (error) {
    console.error('Error sending job alert digest:', error);
    return false;
  }
}

// Process notifications queue (for batch sending)
export async function processNotificationsQueue() {
  try {
    console.log('Processing notifications queue...');
    return true;
  } catch (error) {
    console.error('Error processing notifications queue:', error);
    return false;
  }
}
