import { Controller, Get, Put, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserSettingsService } from './user-settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

export class AccessibilitySettingsDto {
  fontSize?: 'small' | 'medium' | 'large' | 'extra-large';
  highContrastMode?: boolean;
  reducedMotion?: boolean;
  screenReaderOptimized?: boolean;
  contrast?: 'normal' | 'high' | 'extra-high';
  keyboardNavigationMode?: boolean;
  audioDescriptions?: boolean;
  captionsEnabled?: boolean;
}

@ApiTags('Accessibility')
@Controller('accessibility')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AccessibilityController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @Get('settings')
  @ApiOperation({ 
    summary: 'Get user accessibility settings',
    description: 'Retrieve the current accessibility preferences for the authenticated user'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Accessibility settings retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        fontSize: { type: 'string', enum: ['small', 'medium', 'large', 'extra-large'] },
        highContrastMode: { type: 'boolean' },
        reducedMotion: { type: 'boolean' },
        screenReaderOptimized: { type: 'boolean' },
        contrast: { type: 'string', enum: ['normal', 'high', 'extra-high'] },
        keyboardNavigationMode: { type: 'boolean' },
        audioDescriptions: { type: 'boolean' },
        captionsEnabled: { type: 'boolean' }
      }
    }
  })
  async getAccessibilitySettings(@Req() req) {
    const settings = await this.userSettingsService.findByUser(req.user.id);
    
    return {
      fontSize: settings.fontSize,
      highContrastMode: settings.highContrastMode,
      reducedMotion: settings.reducedMotion,
      screenReaderOptimized: settings.screenReaderOptimized,
      contrast: settings.contrast,
      keyboardNavigationMode: settings.keyboardNavigationMode,
      audioDescriptions: settings.audioDescriptions,
      captionsEnabled: settings.captionsEnabled
    };
  }

  @Put('settings')
  @ApiOperation({ 
    summary: 'Update user accessibility settings',
    description: 'Update accessibility preferences for the authenticated user'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Accessibility settings updated successfully' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid accessibility settings provided' 
  })
  async updateAccessibilitySettings(
    @Req() req,
    @Body() accessibilitySettings: AccessibilitySettingsDto
  ) {
    const updatedSettings = await this.userSettingsService.update(
      req.user.id, 
      accessibilitySettings
    );

    return {
      message: 'Accessibility settings updated successfully',
      settings: {
        fontSize: updatedSettings.fontSize,
        highContrastMode: updatedSettings.highContrastMode,
        reducedMotion: updatedSettings.reducedMotion,
        screenReaderOptimized: updatedSettings.screenReaderOptimized,
        contrast: updatedSettings.contrast,
        keyboardNavigationMode: updatedSettings.keyboardNavigationMode,
        audioDescriptions: updatedSettings.audioDescriptions,
        captionsEnabled: updatedSettings.captionsEnabled
      }
    };
  }

  @Get('recommendations')
  @ApiOperation({ 
    summary: 'Get accessibility recommendations',
    description: 'Get personalized accessibility recommendations based on user behavior and preferences'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Accessibility recommendations retrieved successfully' 
  })
  async getAccessibilityRecommendations(@Req() req) {
    const settings = await this.userSettingsService.findByUser(req.user.id);
    
    const recommendations = [];

    // Provide recommendations based on current settings
    if (!settings.screenReaderOptimized && !settings.highContrastMode) {
      recommendations.push({
        type: 'visual',
        title: 'Consider High Contrast Mode',
        description: 'High contrast mode can improve readability and reduce eye strain.',
        action: 'Enable high contrast mode in your accessibility settings'
      });
    }

    if (!settings.captionsEnabled) {
      recommendations.push({
        type: 'audio',
        title: 'Enable Captions',
        description: 'Captions help you follow along with video content and improve comprehension.',
        action: 'Enable captions for all video content'
      });
    }

    if (!settings.keyboardNavigationMode) {
      recommendations.push({
        type: 'navigation',
        title: 'Try Keyboard Navigation',
        description: 'Keyboard navigation can be faster and more precise than mouse navigation.',
        action: 'Enable keyboard navigation mode'
      });
    }

    return {
      recommendations,
      totalCount: recommendations.length
    };
  }

  @Get('help')
  @ApiOperation({ 
    summary: 'Get accessibility help and documentation',
    description: 'Retrieve help documentation and resources for accessibility features'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Accessibility help retrieved successfully' 
  })
  async getAccessibilityHelp() {
    return {
      keyboardShortcuts: [
        { key: 'Tab', description: 'Navigate to next interactive element' },
        { key: 'Shift + Tab', description: 'Navigate to previous interactive element' },
        { key: 'Enter', description: 'Activate buttons and links' },
        { key: 'Space', description: 'Activate buttons and checkboxes' },
        { key: 'Escape', description: 'Close modals and menus' },
        { key: 'Arrow Keys', description: 'Navigate within menus and lists' }
      ],
      screenReaderTips: [
        'Use headings to navigate quickly through content',
        'Listen for landmark announcements to understand page structure',
        'Use the elements list to jump to specific content types',
        'Enable verbosity settings for more detailed descriptions'
      ],
      supportResources: [
        {
          title: 'Accessibility Documentation',
          url: '/docs/accessibility',
          description: 'Complete guide to accessibility features'
        },
        {
          title: 'Contact Support',
          url: '/support/accessibility',
          description: 'Get help with accessibility issues'
        },
        {
          title: 'Feedback Form',
          url: '/feedback/accessibility',
          description: 'Report accessibility problems or suggestions'
        }
      ]
    };
  }
}
