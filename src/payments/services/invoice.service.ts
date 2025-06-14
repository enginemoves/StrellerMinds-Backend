@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>
  ) {}

  async generateInvoice(data: {
    customerId: string;
    paymentId?: string;
    subscriptionId?: string;
    amount: number;
    currency: string;
    description?: string;
    lineItems?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
  }): Promise<Invoice> {
    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = this.invoiceRepository.create({
      invoiceNumber,
      customerId: data.customerId,
      paymentId: data.paymentId,
      subscriptionId: data.subscriptionId,
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      lineItems: data.lineItems,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      paidAt: data.paymentId ? new Date() : null
    });

    await this.invoiceRepository.save(invoice);
    this.logger.log(`Invoice ${invoiceNumber} generated for customer ${data.customerId}`);

    return invoice;
  }

  async getCustomerInvoices(customerId: string) {
    return this.invoiceRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' }
    });
  }

  async markInvoicePaid(invoiceId: string, paymentId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId }
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    invoice.paymentId = paymentId;
    invoice.paidAt = new Date();

    await this.invoiceRepository.save(invoice);
    return invoice;
  }

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await this.invoiceRepository.count();
    const sequence = String(count + 1).padStart(6, '0');
    
    return `INV-${year}${month}-${sequence}`;
  }
}
