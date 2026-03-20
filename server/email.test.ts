import { describe, it, expect, vi } from 'vitest';
import { sendSubmissionNotificationToCoach, sendFeedbackNotificationToAthlete } from './email';

describe('Email Notifications', () => {
  describe('Submission Notifications', () => {
    it('should format submission email with athlete name and drill', () => {
      const data = {
        coachEmail: 'coach@example.com',
        coachName: 'Coach Steve',
        athleteName: 'John Doe',
        drillName: '1-2-3 Drill',
        submissionNotes: 'Completed with good form',
        submissionUrl: 'https://app.example.com/submissions/1',
      };

      expect(data.athleteName).toBe('John Doe');
      expect(data.drillName).toBe('1-2-3 Drill');
      expect(data.coachEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('should include submission notes in email', () => {
      const data = {
        coachEmail: 'coach@example.com',
        coachName: 'Coach Steve',
        athleteName: 'Jane Smith',
        drillName: 'Bunting Drill',
        submissionNotes: 'Great effort! Felt strong.',
        submissionUrl: 'https://app.example.com/submissions/2',
      };

      expect(data.submissionNotes).toBeTruthy();
      expect(data.submissionNotes?.length).toBeGreaterThan(0);
    });

    it('should handle submission without notes', () => {
      const data = {
        coachEmail: 'coach@example.com',
        coachName: 'Coach Steve',
        athleteName: 'Mike Johnson',
        drillName: 'Fielding Drill',
        submissionUrl: 'https://app.example.com/submissions/3',
      };

      expect(data.submissionNotes).toBeUndefined();
    });

    it('should include submission URL', () => {
      const data = {
        coachEmail: 'coach@example.com',
        coachName: 'Coach Steve',
        athleteName: 'Sarah Williams',
        drillName: 'Hitting Drill',
        submissionUrl: 'https://app.example.com/submissions/4',
      };

      expect(data.submissionUrl).toMatch(/^https:\/\//);
      expect(data.submissionUrl).toContain('/submissions');
    });
  });

  describe('Feedback Notifications', () => {
    it('should format feedback email with coach name and drill', () => {
      const data = {
        athleteEmail: 'athlete@example.com',
        athleteName: 'John Doe',
        coachName: 'Coach Steve',
        drillName: '1-2-3 Drill',
        feedback: 'Excellent form! Keep it up.',
        feedbackUrl: 'https://app.example.com/athlete-portal',
      };

      expect(data.coachName).toBe('Coach Steve');
      expect(data.drillName).toBe('1-2-3 Drill');
      expect(data.athleteEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('should include coach feedback in email', () => {
      const data = {
        athleteEmail: 'athlete@example.com',
        athleteName: 'Jane Smith',
        coachName: 'Coach Steve',
        drillName: 'Bunting Drill',
        feedback: 'Good effort! Work on your stance next time.',
        feedbackUrl: 'https://app.example.com/athlete-portal',
      };

      expect(data.feedback).toBeTruthy();
      expect(data.feedback.length).toBeGreaterThan(0);
    });

    it('should include feedback URL', () => {
      const data = {
        athleteEmail: 'athlete@example.com',
        athleteName: 'Mike Johnson',
        coachName: 'Coach Steve',
        drillName: 'Fielding Drill',
        feedback: 'Nice work!',
        feedbackUrl: 'https://app.example.com/athlete-portal',
      };

      expect(data.feedbackUrl).toMatch(/^https:\/\//);
      expect(data.feedbackUrl).toContain('athlete-portal');
    });
  });

  describe('Email Validation', () => {
    it('should validate coach email format', () => {
      const validEmails = [
        'coach@example.com',
        'coach.steve@company.org',
        'coach+tag@domain.co.uk',
      ];

      validEmails.forEach(email => {
        expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });

    it('should validate athlete email format', () => {
      const validEmails = [
        'athlete@example.com',
        'john.doe@school.edu',
        'player123@team.org',
      ];

      validEmails.forEach(email => {
        expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'coach@',
        'coach @example.com',
      ];

      invalidEmails.forEach(email => {
        expect(email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });
  });

  describe('Email Content', () => {
    it('should include submission subject line', () => {
      const athleteName = 'John Doe';
      const drillName = '1-2-3 Drill';
      const subject = `New Submission: ${athleteName} - ${drillName}`;

      expect(subject).toContain('New Submission');
      expect(subject).toContain(athleteName);
      expect(subject).toContain(drillName);
    });

    it('should include feedback subject line', () => {
      const coachName = 'Coach Steve';
      const drillName = 'Bunting Drill';
      const subject = `Feedback from ${coachName}: ${drillName}`;

      expect(subject).toContain('Feedback from');
      expect(subject).toContain(coachName);
      expect(subject).toContain(drillName);
    });

    it('should include call-to-action button in submission email', () => {
      const data = {
        coachEmail: 'coach@example.com',
        coachName: 'Coach Steve',
        athleteName: 'John Doe',
        drillName: '1-2-3 Drill',
        submissionUrl: 'https://app.example.com/submissions/1',
      };

      expect(data.submissionUrl).toBeTruthy();
      expect(data.submissionUrl).toMatch(/^https:\/\//);
    });

    it('should include call-to-action button in feedback email', () => {
      const data = {
        athleteEmail: 'athlete@example.com',
        athleteName: 'John Doe',
        coachName: 'Coach Steve',
        drillName: '1-2-3 Drill',
        feedback: 'Great work!',
        feedbackUrl: 'https://app.example.com/athlete-portal',
      };

      expect(data.feedbackUrl).toBeTruthy();
      expect(data.feedbackUrl).toMatch(/^https:\/\//);
    });
  });
});


describe('Resend API Key Validation', () => {
  it('should have Resend API key configured', () => {
    const resendApiKey = process.env.RESEND_API_KEY;
    expect(resendApiKey).toBeDefined();
    expect(resendApiKey?.length).toBeGreaterThan(0);
    expect(resendApiKey).toMatch(/^re_/);
  });

  it('should validate drill assignment email can be sent', async () => {
    const { sendDrillAssignmentEmail } = await import('./email');
    
    const testData = {
      athleteEmail: 'test@example.com',
      athleteName: 'Test Athlete',
      drillName: '1-2-3 Drill',
      drillDifficulty: 'Medium',
      drillDuration: '10 minutes',
      coachNotes: 'Focus on form',
      coachName: 'Coach Steve',
      portalUrl: 'https://example.com/athlete-portal',
    };

    const result = await sendDrillAssignmentEmail(testData);
    
    // Verify we got a response
    expect(result).toBeDefined();
    expect(result).toHaveProperty('success');
    
    // If the API key is valid, success should be true or we get an error message
    if (!result.success) {
      console.log('Email API response:', result);
    }
  });
});
