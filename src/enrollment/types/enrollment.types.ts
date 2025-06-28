import { CreateEnrollmentDto } from "../dto/create-enrollment.dto";
import { Enrollment } from "../entities/enrollment.entity";

// enrollment.types.ts
export interface EnrollmentWithDetails extends Enrollment {
  student: {
    firstName: string;
    lastName: string;
  };
  career: {
    area: {
      name: string;
    };
  };
  admission: {
    name: string;
  };
}

export interface EnrollmentCreationResult {
  message: string;
  enrollment: Enrollment;
}

export interface IEnrollmentService {
  create(createEnrollmentDto: CreateEnrollmentDto): Promise<EnrollmentCreationResult>;
}