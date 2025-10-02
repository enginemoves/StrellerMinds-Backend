import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { I18nService } from 'nestjs-i18n'
import { PdfGeneratorService } from './pdf-generator.service'

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,AAAA'),
}))

import * as QRCode from 'qrcode'

describe('PdfGeneratorService', () => {
  let service: PdfGeneratorService
  let configService: jest.Mocked<ConfigService>
  let i18nService: jest.Mocked<I18nService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfGeneratorService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockImplementation((key: string, def?: any) => {
            if (key === 'APP_BASE_URL') return 'https://api.example.com'
            return def
          }) },
        },
        {
          provide: I18nService,
          useValue: { t: jest.fn().mockReturnValue('translated') },
        },
      ],
    }).compile()

    service = module.get(PdfGeneratorService)
    configService = module.get(ConfigService)
    i18nService = module.get(I18nService)
  })

  it('generates a PDF and embeds QR for the verification URL', async () => {
    const data = {
      userName: 'John Doe',
      courseName: 'Intro to JS',
      completionDate: new Date('2024-01-15T00:00:00Z'),
      issueDate: new Date('2024-01-16T00:00:00Z'),
      certificateId: 'test-cert',
      language: 'en',
    }

    const buffer = await service.generateCertificatePDF(data as any)

    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)

    // QR should target the verify route
    expect(QRCode.toDataURL).toHaveBeenCalledWith(
      'https://api.example.com/certificates/test-cert/verify',
      expect.objectContaining({ width: 150 })
    )

    // i18n is used to translate labels
    expect(i18nService.t).toHaveBeenCalledWith('certificates.certificate.title', expect.any(Object))
    expect(i18nService.t).toHaveBeenCalledWith('certificates.branding.institution', expect.any(Object))
  })
})
