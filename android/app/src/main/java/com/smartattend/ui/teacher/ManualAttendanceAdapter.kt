package com.smartattend.ui.teacher

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.smartattend.databinding.ItemManualAttendanceBinding
import com.smartattend.domain.model.AttendanceRecordInput
import com.smartattend.domain.model.Student

class ManualAttendanceAdapter(
    private val students: List<Student>
) : RecyclerView.Adapter<ManualAttendanceAdapter.ViewHolder>() {

    private val statusMap = mutableMapOf<String, String>()

    init {
        students.forEach { statusMap[it.id] = "present" }
    }

    inner class ViewHolder(private val binding: ItemManualAttendanceBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(student: Student) {
            binding.tvStudentName.text = student.name
            binding.tvStudentId.text = "${student.studentId} | ${student.rollNumber ?: ""}"

            val status = statusMap[student.id] ?: "present"
            binding.chipPresent.isChecked = status == "present"
            binding.chipAbsent.isChecked = status == "absent"
            binding.chipLate.isChecked = status == "late"

            binding.chipPresent.setOnClickListener { statusMap[student.id] = "present"; updateChips(student.id) }
            binding.chipAbsent.setOnClickListener { statusMap[student.id] = "absent"; updateChips(student.id) }
            binding.chipLate.setOnClickListener { statusMap[student.id] = "late"; updateChips(student.id) }
        }

        private fun updateChips(studentId: String) {
            val status = statusMap[studentId]
            binding.chipPresent.isChecked = status == "present"
            binding.chipAbsent.isChecked = status == "absent"
            binding.chipLate.isChecked = status == "late"
        }
    }

    fun markAll(status: String) {
        students.forEach { statusMap[it.id] = status }
        notifyDataSetChanged()
    }

    fun getRecords(): List<AttendanceRecordInput> =
        students.map { AttendanceRecordInput(it.id, statusMap[it.id] ?: "present") }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        ViewHolder(ItemManualAttendanceBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(students[position])

    override fun getItemCount() = students.size
}
