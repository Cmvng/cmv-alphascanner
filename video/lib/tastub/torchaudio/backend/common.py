class AudioMetaData:
    def __init__(self, sample_rate, num_frames, num_channels, bits_per_sample, encoding):
        self.sample_rate, self.num_frames, self.num_channels, self.bits_per_sample, self.encoding = sample_rate, num_frames, num_channels, bits_per_sample, encoding
